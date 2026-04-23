import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  parseFile,
  signatureFor,
  classifyGroup,
  guessFieldType,
  detectExtension,
  type ParsedStructure,
  type RegistryEntry,
} from "./ingestion.server";

// ----------------------------------------------------------------------------
// createRun
// ----------------------------------------------------------------------------
export const createIngestionRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name?: string }) => z.object({ name: z.string().max(200).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("ingestion_runs")
      .insert({ name: data.name ?? `Import · ${new Date().toLocaleString()}`, status: "draft" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { runId: row.id };
  });

// ----------------------------------------------------------------------------
// recordUploadedFile  — called once per file *after* it's been put in storage
// ----------------------------------------------------------------------------
export const recordUploadedFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    runId: string;
    storagePath: string;
    filename: string;
    mimeType?: string;
    sizeBytes?: number;
    sha256?: string;
  }) =>
    z.object({
      runId: z.string().uuid(),
      storagePath: z.string().min(1).max(1024),
      filename: z.string().min(1).max(512),
      mimeType: z.string().max(200).optional(),
      sizeBytes: z.number().int().min(0).max(50_000_000).optional(),
      sha256: z.string().max(128).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Dedupe: any prior file (any run) with the same sha for this user
    let duplicateOf: string | null = null;
    if (data.sha256) {
      const { data: existing } = await supabase
        .from("ingestion_files")
        .select("id")
        .eq("sha256", data.sha256)
        .neq("storage_path", data.storagePath)
        .limit(1)
        .maybeSingle();
      if (existing) duplicateOf = existing.id;
    }

    const ext = detectExtension(data.filename);
    const { data: row, error } = await supabase
      .from("ingestion_files")
      .insert({
        run_id: data.runId,
        storage_path: data.storagePath,
        filename: data.filename,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
        sha256: data.sha256 ?? null,
        extension: ext,
        duplicate_of: duplicateOf,
      })
      .select("id, duplicate_of")
      .single();
    if (error) throw new Error(error.message);

    // Bump file_count
    await supabase.rpc("noop").catch(() => {}); // optional: ignored
    await supabase
      .from("ingestion_runs")
      .update({ file_count: await fileCount(supabase, data.runId) })
      .eq("id", data.runId);

    return { fileId: row.id, duplicate: !!row.duplicate_of };
  });

async function fileCount(supabase: any, runId: string) {
  const { count } = await supabase
    .from("ingestion_files")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);
  return count ?? 0;
}

// ----------------------------------------------------------------------------
// analyzeRun  — parse, group, classify, suggest
// ----------------------------------------------------------------------------
export const analyzeRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const runId = data.runId;

    await supabase.from("ingestion_runs").update({ status: "analyzing", started_at: new Date().toISOString() }).eq("id", runId);

    // Load files (skip duplicates)
    const { data: files, error: filesErr } = await supabase
      .from("ingestion_files")
      .select("id, filename, storage_path, extension, duplicate_of")
      .eq("run_id", runId)
      .is("duplicate_of", null);
    if (filesErr) throw new Error(filesErr.message);

    // Load registry + learned aliases
    const [{ data: registry }, { data: aliasRows }] = await Promise.all([
      supabase.from("ingestion_object_registry").select("object_type, display_name, target_table, required_fields, optional_fields").eq("enabled", true),
      supabase.from("ingestion_mapping_rules").select("pattern, target_object_type, target_table").eq("created_by", userId),
    ]);
    const aliasMap = new Map<string, { target_object_type: string | null; target_table: string | null }>();
    for (const r of aliasRows ?? []) aliasMap.set(r.pattern.toLowerCase(), { target_object_type: r.target_object_type, target_table: r.target_table });

    // Parse each file (download from storage)
    const parsed: Array<{ id: string; filename: string; ext: string; structure: ParsedStructure; signature: string }> = [];
    for (const f of files ?? []) {
      const dl = await supabase.storage.from("ingestion").download(f.storage_path);
      let structure: ParsedStructure = { kind: "unknown", preview: "" };
      if (!dl.error && dl.data) {
        const buf = await dl.data.arrayBuffer();
        try { structure = parseFile(f.filename, buf); }
        catch (e) { structure = { kind: "unknown", preview: String(e).slice(0, 200) }; }
      }
      const sig = signatureFor(structure, f.extension ?? "");
      parsed.push({ id: f.id, filename: f.filename, ext: f.extension ?? "", structure, signature: sig });

      await supabase.from("ingestion_files").update({
        parsed_text: structure.preview ?? null,
        structure_json: structure as any,
      }).eq("id", f.id);
    }

    // Group by signature
    const groups = new Map<string, typeof parsed>();
    for (const p of parsed) {
      const arr = groups.get(p.signature) ?? [];
      arr.push(p);
      groups.set(p.signature, arr);
    }

    // Reset prior groups/classifications/suggestions for re-analysis
    await Promise.all([
      supabase.from("ingestion_classifications").delete().eq("run_id", runId),
      supabase.from("ingestion_schema_suggestions").delete().eq("run_id", runId),
      supabase.from("ingestion_object_suggestions").delete().eq("run_id", runId),
      supabase.from("ingestion_file_groups").delete().eq("run_id", runId),
    ]);

    let schemaCount = 0;
    let objectCount = 0;
    const groupRowIds: string[] = [];

    for (const [sig, members] of groups.entries()) {
      const sample = members[0].structure;
      const proposal = classifyGroup(sample, (registry ?? []) as RegistryEntry[], aliasMap);
      const patternLabel = describePattern(sample);

      const { data: g, error: gErr } = await supabase.from("ingestion_file_groups").insert({
        run_id: runId,
        signature: sig,
        pattern_label: patternLabel,
        heading_pattern: sample.headings ?? null,
        column_signature: sample.columns ?? null,
        sample_count: members.length,
        proposed_object_type: proposal.object_type,
        proposed_target_table: proposal.target_table,
        confidence: proposal.confidence,
        rationale: proposal.rationale,
        status: proposal.object_type ? "proposed" : "needs_review",
      }).select("id").single();
      if (gErr) throw new Error(gErr.message);
      groupRowIds.push(g.id);

      // Per-file classification rows + group_id link
      const classRows = members.map((m) => ({
        run_id: runId,
        file_id: m.id,
        group_id: g.id,
        target_object_type: proposal.object_type,
        target_table: proposal.target_table,
        matched_field_count: proposal.matched_fields.length,
        unmatched_field_count: proposal.unmatched_fields.length,
        confidence: proposal.confidence,
        rationale: proposal.rationale,
        status: proposal.object_type ? "proposed" : "needs_review",
      }));
      if (classRows.length) await supabase.from("ingestion_classifications").insert(classRows);
      await supabase.from("ingestion_files").update({ group_id: g.id }).in("id", members.map((m) => m.id));

      // Schema suggestions for unmatched fields
      for (const f of proposal.unmatched_fields) {
        const samples = collectSamples(members, f);
        await supabase.from("ingestion_schema_suggestions").insert({
          run_id: runId,
          group_id: g.id,
          source_column: f,
          sample_values: samples,
          guessed_type: guessFieldType(samples),
          suggested_destination_table: proposal.target_table,
          suggested_field_name: f.replace(/[^a-z0-9_]/gi, "_").toLowerCase(),
          occurrence_count: members.length,
          rationale: `Found in ${members.length} file(s) of group "${patternLabel}"`,
        });
        schemaCount++;
      }

      // New-object suggestion when we have many files but no type
      if (!proposal.object_type && members.length >= 3) {
        await supabase.from("ingestion_object_suggestions").insert({
          run_id: runId,
          group_id: g.id,
          proposed_name: patternLabel || "Unnamed object type",
          evidence_file_ids: members.map((m) => m.id),
          suggested_fields: collectFieldShape(members),
          rationale: `${members.length} files share this shape but no existing type matched.`,
        });
        objectCount++;
      }
    }

    await supabase.from("ingestion_runs").update({
      status: "review",
      group_count: groupRowIds.length,
      schema_suggestion_count: schemaCount,
      object_suggestion_count: objectCount,
    }).eq("id", runId);

    return { groupCount: groupRowIds.length, schemaSuggestionCount: schemaCount, objectSuggestionCount: objectCount };
  });

function describePattern(s: ParsedStructure): string {
  if (s.kind === "csv" && s.columns?.length) return `CSV · ${s.columns.slice(0, 4).join(", ")}${s.columns.length > 4 ? "…" : ""}`;
  if (s.kind === "markdown") {
    const fm = Object.keys(s.frontmatter ?? {});
    const hs = (s.headings ?? []).slice(0, 3).map((h) => h.replace(/^#+\s+/, ""));
    return `MD · ${fm.length ? `frontmatter: ${fm.slice(0,3).join(",")}` : hs.join(" / ") || "headings"}`;
  }
  if (s.kind === "json") return `JSON · ${(s.jsonKeys ?? []).slice(0, 4).join(", ")}`;
  if (s.kind === "text") return "Plain text";
  return "Unknown shape";
}

function collectSamples(members: Array<{ structure: ParsedStructure }>, field: string): string[] {
  const out: string[] = [];
  for (const m of members) {
    const s = m.structure;
    if (s.kind === "csv" && s.columns && s.sampleRows) {
      const idx = s.columns.indexOf(field.toLowerCase());
      if (idx >= 0) for (const row of s.sampleRows) if (row[idx]) out.push(row[idx]);
    } else if (s.kind === "markdown" && s.frontmatter) {
      const v = s.frontmatter[field.toLowerCase()];
      if (v) out.push(v);
    }
    if (out.length >= 5) break;
  }
  return out.slice(0, 5);
}

function collectFieldShape(members: Array<{ structure: ParsedStructure }>): Array<{ name: string; type: string }> {
  const fieldsMap = new Map<string, string[]>();
  for (const m of members) {
    const s = m.structure;
    const fields = s.kind === "csv" ? (s.columns ?? []) : s.kind === "markdown" ? Object.keys(s.frontmatter ?? {}) : (s.jsonKeys ?? []);
    for (const f of fields) {
      const arr = fieldsMap.get(f) ?? [];
      const samples = collectSamples([m], f);
      arr.push(...samples);
      fieldsMap.set(f, arr);
    }
  }
  return Array.from(fieldsMap.entries()).map(([name, samples]) => ({ name, type: guessFieldType(samples) }));
}

// ----------------------------------------------------------------------------
// updateClassification  — user edits per-file or per-group
// ----------------------------------------------------------------------------
export const updateClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    classificationId: string;
    target_object_type?: string | null;
    target_table?: string | null;
    status?: "proposed" | "approved" | "excluded" | "needs_review";
  }) => z.object({
    classificationId: z.string().uuid(),
    target_object_type: z.string().max(100).nullable().optional(),
    target_table: z.string().max(100).nullable().optional(),
    status: z.enum(["proposed","approved","excluded","needs_review"]).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: Record<string, unknown> = {};
    if (data.target_object_type !== undefined) patch.target_object_type = data.target_object_type;
    if (data.target_table !== undefined) patch.target_table = data.target_table;
    if (data.status !== undefined) patch.status = data.status;
    const { error } = await supabase.from("ingestion_classifications").update(patch).eq("id", data.classificationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------------------------------------------------------------------------
// approveGroup  — approve / change type / exclude all files in a group
// ----------------------------------------------------------------------------
export const approveGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    groupId: string;
    action: "approve" | "exclude" | "change_type";
    target_object_type?: string | null;
    target_table?: string | null;
  }) => z.object({
    groupId: z.string().uuid(),
    action: z.enum(["approve","exclude","change_type"]),
    target_object_type: z.string().max(100).nullable().optional(),
    target_table: z.string().max(100).nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const status = data.action === "exclude" ? "excluded" : "approved";
    const groupPatch: Record<string, unknown> = { status };
    const filePatch: Record<string, unknown> = { status };
    if (data.action === "change_type") {
      groupPatch.proposed_object_type = data.target_object_type;
      groupPatch.proposed_target_table = data.target_table;
      filePatch.target_object_type = data.target_object_type;
      filePatch.target_table = data.target_table;
    }
    const { data: group } = await supabase.from("ingestion_file_groups").select("signature, proposed_object_type, proposed_target_table").eq("id", data.groupId).single();

    await supabase.from("ingestion_file_groups").update(groupPatch).eq("id", data.groupId);
    await supabase.from("ingestion_classifications").update(filePatch).eq("group_id", data.groupId);

    // Save as learned rule on approve
    if (data.action === "approve" && group?.proposed_object_type) {
      await supabase.from("ingestion_mapping_rules").upsert({
        pattern_kind: "signature",
        pattern: group.signature,
        target_object_type: group.proposed_object_type,
        target_table: group.proposed_target_table,
        scope: "global",
        hit_count: 1,
        created_by: userId,
      }, { onConflict: "pattern_kind,pattern" }).select();
    }
    return { ok: true };
  });

// ----------------------------------------------------------------------------
// updateSchemaSuggestion / updateObjectSuggestion
// ----------------------------------------------------------------------------
export const updateSchemaSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "proposed"|"approved"|"skipped"|"renamed"; approved_field_name?: string }) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["proposed","approved","skipped","renamed"]),
      approved_field_name: z.string().max(100).optional(),
    }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: Record<string, unknown> = { status: data.status };
    if (data.approved_field_name) patch.approved_field_name = data.approved_field_name;
    const { error } = await supabase.from("ingestion_schema_suggestions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateObjectSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "proposed"|"approved"|"skipped"|"renamed" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["proposed","approved","skipped","renamed"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("ingestion_object_suggestions").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------------------------------------------------------------------------
// runImport  — execute approved classifications
// ----------------------------------------------------------------------------
export const runImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const runId = data.runId;

    await supabase.from("ingestion_runs").update({ status: "importing" }).eq("id", runId);
    await supabase.from("ingestion_results").delete().eq("run_id", runId);

    const { data: classes } = await supabase
      .from("ingestion_classifications")
      .select("id, file_id, target_object_type, target_table, status, ingestion_files(filename, structure_json)")
      .eq("run_id", runId)
      .eq("status", "approved");

    let created = 0, updated = 0, skipped = 0, failed = 0;

    for (const c of (classes ?? []) as any[]) {
      try {
        if (!c.target_table || !c.target_object_type) {
          await supabase.from("ingestion_results").insert({
            run_id: runId, file_id: c.file_id, status: "skipped",
            notes: "No target type/table",
          });
          skipped++;
          continue;
        }
        const file = c.ingestion_files;
        const struct = file?.structure_json as ParsedStructure | undefined;
        const rows = buildRowsForInsert(struct, c.target_object_type, file?.filename ?? "untitled");

        if (rows.length === 0) {
          await supabase.from("ingestion_results").insert({
            run_id: runId, file_id: c.file_id, status: "skipped",
            notes: "Could not derive any insertable row",
          });
          skipped++;
          continue;
        }

        const { data: ins, error: insErr } = await supabase.from(c.target_table).insert(rows).select("id").limit(1).maybeSingle();
        if (insErr) {
          await supabase.from("ingestion_results").insert({
            run_id: runId, file_id: c.file_id, status: "failed",
            error_message: insErr.message,
          });
          failed++;
          continue;
        }

        await supabase.from("ingestion_results").insert({
          run_id: runId, file_id: c.file_id, status: "created",
          created_entity_kind: c.target_object_type,
          created_entity_id: ins?.id ?? null,
          created_entity_table: c.target_table,
          notes: `${rows.length} row(s) inserted`,
        });
        created++;
      } catch (e) {
        await supabase.from("ingestion_results").insert({
          run_id: runId, file_id: c.file_id, status: "failed",
          error_message: String(e).slice(0, 500),
        });
        failed++;
      }
    }

    await supabase.from("ingestion_runs").update({
      status: "complete",
      finished_at: new Date().toISOString(),
      created_count: created,
      updated_count: updated,
      skipped_count: skipped,
      failed_count: failed,
    }).eq("id", runId);

    return { created, updated, skipped, failed };
  });

function buildRowsForInsert(struct: ParsedStructure | undefined, objectType: string, filename: string): Record<string, unknown>[] {
  if (!struct) return [];
  // CSV → one row per data row
  if (struct.kind === "csv" && struct.columns && struct.sampleRows) {
    return struct.sampleRows.map((row) => {
      const obj: Record<string, unknown> = {};
      struct.columns!.forEach((col, i) => {
        if (row[i] !== undefined && row[i] !== "") obj[col] = row[i];
      });
      ensureRequired(obj, objectType, filename);
      return obj;
    }).filter((r) => Object.keys(r).length > 0);
  }
  // Markdown → one row from frontmatter + filename as name
  if (struct.kind === "markdown") {
    const obj: Record<string, unknown> = { ...(struct.frontmatter ?? {}) };
    ensureRequired(obj, objectType, filename);
    return [obj];
  }
  // JSON → if it's an array, flatten, else one row
  return [];
}

function ensureRequired(obj: Record<string, unknown>, objectType: string, filename: string) {
  const name = filename.replace(/\.[^.]+$/, "");
  if (!obj.name && !obj.campaign_name && !obj.decision) obj.name = name;
}

// ----------------------------------------------------------------------------
// listIngestionData  — page-load fetch
// ----------------------------------------------------------------------------
export const listIngestionRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("ingestion_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { runs: data ?? [] };
  });

export const getIngestionRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [runRes, filesRes, groupsRes, classesRes, schemaRes, objRes, resultsRes, registryRes, rulesRes] = await Promise.all([
      supabase.from("ingestion_runs").select("*").eq("id", data.runId).single(),
      supabase.from("ingestion_files").select("*").eq("run_id", data.runId).order("created_at"),
      supabase.from("ingestion_file_groups").select("*").eq("run_id", data.runId).order("sample_count", { ascending: false }),
      supabase.from("ingestion_classifications").select("*").eq("run_id", data.runId),
      supabase.from("ingestion_schema_suggestions").select("*").eq("run_id", data.runId).order("occurrence_count", { ascending: false }),
      supabase.from("ingestion_object_suggestions").select("*").eq("run_id", data.runId),
      supabase.from("ingestion_results").select("*").eq("run_id", data.runId).order("created_at"),
      supabase.from("ingestion_object_registry").select("*").eq("enabled", true).order("sort_order"),
      supabase.from("ingestion_mapping_rules").select("*").order("hit_count", { ascending: false }).limit(50),
    ]);
    return {
      run: runRes.data,
      files: filesRes.data ?? [],
      groups: groupsRes.data ?? [],
      classifications: classesRes.data ?? [],
      schemaSuggestions: schemaRes.data ?? [],
      objectSuggestions: objRes.data ?? [],
      results: resultsRes.data ?? [],
      registry: registryRes.data ?? [],
      mappingRules: rulesRes.data ?? [],
    };
  });

export const deleteMappingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ingestion_mapping_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
