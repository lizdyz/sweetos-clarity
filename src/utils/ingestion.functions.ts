import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  parseFile,
  signatureFor,
  classifyGroup,
  guessFieldType,
  detectExtension,
  findLikelyAlias,
  type ParsedStructure,
  type RegistryEntry,
} from "./ingestion.server";

// All ingestion tables are strict-typed at the SDK boundary; this app uses an
// untyped client for dynamic table access. We cast once here for clarity.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const ANALYSIS_CHUNK_SIZE = 25;
const SCHEMA_SUGGESTION_CAP = 30;
const OBJECT_SUGGESTION_CAP = 5;

// ----------------------------------------------------------------------------
// createIngestionRun
// ----------------------------------------------------------------------------
export const createIngestionRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name?: string }) => z.object({ name: z.string().max(200).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const { data: row, error } = await supabase
      .from("ingestion_runs")
      .insert({ name: data.name ?? `Import · ${new Date().toLocaleString()}`, status: "draft" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { runId: row.id as string };
  });

// ----------------------------------------------------------------------------
// recordUploadedFile
// ----------------------------------------------------------------------------
export const recordUploadedFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    runId: string;
    storagePath: string;
    filename: string;
    sourcePath?: string | null;
    mimeType?: string;
    sizeBytes?: number;
    sha256?: string;
  }) =>
    z.object({
      runId: z.string().uuid(),
      storagePath: z.string().min(1).max(1024),
      filename: z.string().min(1).max(512),
      sourcePath: z.string().max(1024).nullable().optional(),
      mimeType: z.string().max(200).optional(),
      sizeBytes: z.number().int().min(0).max(50_000_000).optional(),
      sha256: z.string().max(128).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;

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
        source_path: data.sourcePath ?? data.filename,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
        sha256: data.sha256 ?? null,
        extension: ext,
        duplicate_of: duplicateOf,
      })
      .select("id, duplicate_of")
      .single();
    if (error) throw new Error(error.message);

    const { count } = await supabase
      .from("ingestion_files")
      .select("id", { count: "exact", head: true })
      .eq("run_id", data.runId);
    await supabase.from("ingestion_runs").update({ file_count: count ?? 0 }).eq("id", data.runId);

    return { fileId: row.id as string, duplicate: !!row.duplicate_of };
  });

// ----------------------------------------------------------------------------
// analyzeRun (orchestration only)
// ----------------------------------------------------------------------------
export const analyzeRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const runId = data.runId;

    const { count } = await supabase
      .from("ingestion_files")
      .select("id", { count: "exact", head: true })
      .eq("run_id", runId)
      .is("duplicate_of", null);
    const total = count ?? 0;

    // Reset prior derived data for this run before re-analyzing
    await Promise.all([
      supabase.from("ingestion_classifications").delete().eq("run_id", runId),
      supabase.from("ingestion_schema_suggestions").delete().eq("run_id", runId),
      supabase.from("ingestion_object_suggestions").delete().eq("run_id", runId),
      supabase.from("ingestion_file_groups").delete().eq("run_id", runId),
      supabase.from("ingestion_conflicts").delete().eq("run_id", runId),
      supabase.from("ingestion_files").update({ group_id: null, structure_json: {}, parsed_text: null, parse_error: null }).eq("run_id", runId),
    ]);

    await supabase.from("ingestion_runs").update({
      status: "analyzing",
      started_at: new Date().toISOString(),
      analyzed_file_count: 0,
      analysis_total: total,
      group_count: 0,
      schema_suggestion_count: 0,
      object_suggestion_count: 0,
    }).eq("id", runId);

    return { total, chunkSize: ANALYSIS_CHUNK_SIZE };
  });

// ----------------------------------------------------------------------------
// analyzeChunk — process up to `limit` files starting at `offset`
// ----------------------------------------------------------------------------
export const analyzeChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string; offset: number; limit?: number }) =>
    z.object({
      runId: z.string().uuid(),
      offset: z.number().int().min(0).max(100_000),
      limit: z.number().int().min(1).max(100).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;
    const runId = data.runId;
    const limit = data.limit ?? ANALYSIS_CHUNK_SIZE;

    const [{ data: registry }, { data: aliasRows }] = await Promise.all([
      supabase
        .from("ingestion_object_registry")
        .select("object_type, display_name, target_table, required_fields, optional_fields, conflict_key_fields")
        .eq("enabled", true),
      supabase
        .from("ingestion_mapping_rules")
        .select("pattern, target_object_type, target_table")
        .eq("created_by", userId),
    ]);
    const aliasMap = new Map<string, { target_object_type: string | null; target_table: string | null }>();
    for (const r of (aliasRows ?? []) as Array<{ pattern: string; target_object_type: string | null; target_table: string | null }>) {
      aliasMap.set(r.pattern.toLowerCase(), { target_object_type: r.target_object_type, target_table: r.target_table });
    }

    const { data: files, error: filesErr } = await supabase
      .from("ingestion_files")
      .select("id, filename, storage_path, extension, source_path")
      .eq("run_id", runId)
      .is("duplicate_of", null)
      .order("created_at", { ascending: true })
      .range(data.offset, data.offset + limit - 1);
    if (filesErr) throw new Error(filesErr.message);

    const fileList = (files ?? []) as Array<{ id: string; filename: string; storage_path: string; extension: string | null; source_path: string | null }>;

    // Parse each file in this chunk and stash the structure on the row
    const parsed: Array<{ id: string; filename: string; ext: string; structure: ParsedStructure; signature: string }> = [];
    for (const f of fileList) {
      const dl = await supabase.storage.from("ingestion").download(f.storage_path);
      let structure: ParsedStructure = { kind: "unknown", preview: "" };
      let parseError: string | null = null;
      if (dl.error || !dl.data) {
        parseError = dl.error?.message ?? "download failed";
      } else {
        const buf = await (dl.data as Blob).arrayBuffer();
        try { structure = parseFile(f.filename, buf); }
        catch (e) { parseError = String(e).slice(0, 200); structure = { kind: "unknown", preview: parseError }; }
        if (structure.parseError) parseError = structure.parseError;
      }
      const sig = signatureFor(structure, f.extension ?? "");
      parsed.push({ id: f.id, filename: f.filename, ext: f.extension ?? "", structure, signature: sig });
      await supabase.from("ingestion_files").update({
        parsed_text: structure.preview ?? null,
        structure_json: structure,
        parse_error: parseError,
      }).eq("id", f.id);
    }

    // Group within this chunk + reuse existing groups by signature
    const sigToGroupId = new Map<string, string>();
    {
      const { data: existingGroups } = await supabase
        .from("ingestion_file_groups").select("id, signature").eq("run_id", runId);
      for (const g of (existingGroups ?? []) as Array<{ id: string; signature: string }>) {
        sigToGroupId.set(g.signature, g.id);
      }
    }

    const localGroups = new Map<string, typeof parsed>();
    for (const p of parsed) {
      const arr = localGroups.get(p.signature) ?? [];
      arr.push(p);
      localGroups.set(p.signature, arr);
    }

    const reg = (registry ?? []) as RegistryEntry[];
    const existingColsCache = new Map<string, string[]>();

    for (const [sig, members] of localGroups.entries()) {
      const sample = members[0].structure;
      const proposal = classifyGroup(sample, reg, aliasMap);
      const patternLabel = describePattern(sample);

      let groupId = sigToGroupId.get(sig) ?? null;
      if (!groupId) {
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
        groupId = g.id as string;
        sigToGroupId.set(sig, groupId);
      } else {
        // Bump sample count
        const { data: cur } = await supabase
          .from("ingestion_file_groups")
          .select("sample_count").eq("id", groupId).single();
        await supabase.from("ingestion_file_groups").update({
          sample_count: ((cur?.sample_count ?? 0) as number) + members.length,
        }).eq("id", groupId);
      }

      const classRows = members.map((m) => ({
        run_id: runId,
        file_id: m.id,
        group_id: groupId,
        target_object_type: proposal.object_type,
        target_table: proposal.target_table,
        matched_field_count: proposal.matched_fields.length,
        unmatched_field_count: proposal.unmatched_fields.length,
        confidence: proposal.confidence,
        rationale: proposal.rationale,
        status: proposal.object_type ? "proposed" : "needs_review",
      }));
      if (classRows.length) await supabase.from("ingestion_classifications").insert(classRows);
      await supabase.from("ingestion_files").update({ group_id: groupId }).in("id", members.map((m) => m.id));

      // Schema suggestions per unmatched field, with sprawl guards
      for (const f of proposal.unmatched_fields) {
        const samples = collectSamples(members, f);
        let likelyAlias: string | null = null;
        if (proposal.target_table) {
          if (!existingColsCache.has(proposal.target_table)) {
            existingColsCache.set(proposal.target_table, await fetchExistingColumns(supabase, proposal.target_table));
          }
          likelyAlias = findLikelyAlias(f, existingColsCache.get(proposal.target_table) ?? [], 2);
        }
        await supabase.from("ingestion_schema_suggestions").insert({
          run_id: runId,
          group_id: groupId,
          source_column: f,
          sample_values: samples,
          guessed_type: guessFieldType(samples),
          suggested_destination_table: proposal.target_table,
          suggested_field_name: likelyAlias ?? f.replace(/[^a-z0-9_]/gi, "_").toLowerCase(),
          occurrence_count: members.length,
          rationale: likelyAlias
            ? `Found in ${members.length} file(s) of group "${patternLabel}". Looks like an alias of "${likelyAlias}".`
            : `Found in ${members.length} file(s) of group "${patternLabel}"`,
          likely_alias_of: likelyAlias,
          low_value: members.length <= 1,
        });
      }

      // Suggest a new object type if a coherent shape didn't classify
      if (!proposal.object_type && members.length >= 3) {
        await supabase.from("ingestion_object_suggestions").insert({
          run_id: runId,
          group_id: groupId,
          proposed_name: patternLabel || "Unnamed object type",
          evidence_file_ids: members.map((m) => m.id),
          suggested_fields: collectFieldShape(members, sample),
          rationale: `${members.length} files share this shape but no existing type matched.`,
          likely_alias_of: findLikelyObjectAlias(patternLabel, reg),
        });
      }
    }

    // Update progress and counts
    const newAnalyzed = data.offset + parsed.length;
    const [{ count: groupCount }, { count: schemaCount }, { count: objectCount }] = await Promise.all([
      supabase.from("ingestion_file_groups").select("id", { count: "exact", head: true }).eq("run_id", runId),
      supabase.from("ingestion_schema_suggestions").select("id", { count: "exact", head: true }).eq("run_id", runId),
      supabase.from("ingestion_object_suggestions").select("id", { count: "exact", head: true }).eq("run_id", runId),
    ]);

    const { data: runRow } = await supabase
      .from("ingestion_runs").select("analysis_total").eq("id", runId).single();
    const total = (runRow?.analysis_total ?? newAnalyzed) as number;
    const done = newAnalyzed >= total || parsed.length === 0;

    await supabase.from("ingestion_runs").update({
      analyzed_file_count: Math.min(newAnalyzed, total),
      group_count: groupCount ?? 0,
      schema_suggestion_count: schemaCount ?? 0,
      object_suggestion_count: objectCount ?? 0,
      ...(done ? { status: "review" } : {}),
    }).eq("id", runId);

    return {
      done,
      processed: parsed.length,
      nextOffset: newAnalyzed,
      analyzed: newAnalyzed,
      total,
    };
  });

async function fetchExistingColumns(supabase: AnyClient, tableName: string): Promise<string[]> {
  // Probe the table by selecting one row; column names come back even on empty tables.
  // Fallback: empty list (no alias matching available).
  try {
    const { data, error } = await supabase.from(tableName).select("*").limit(1);
    if (error) return [];
    if (data && data.length > 0) return Object.keys(data[0] as Record<string, unknown>);
    // Empty table — try inserting an empty failure-only probe is too risky; skip.
    return [];
  } catch {
    return [];
  }
}

function findLikelyObjectAlias(label: string | null, registry: RegistryEntry[]): string | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  for (const r of registry) {
    if (lower.includes(r.object_type) || lower.includes(r.display_name.toLowerCase())) return r.object_type;
  }
  return null;
}

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

function collectFieldShape(members: Array<{ structure: ParsedStructure }>, sample: ParsedStructure): Array<{ name: string; type: string }> {
  // Prefer JSON inferred schema if available
  if (sample.kind === "json" && sample.jsonSchema) {
    return Object.entries(sample.jsonSchema).map(([name, t]) => ({ name, type: t }));
  }
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
// updateClassification
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
    const supabase = context.supabase as AnyClient;
    const patch: Record<string, unknown> = {};
    if (data.target_object_type !== undefined) patch.target_object_type = data.target_object_type;
    if (data.target_table !== undefined) patch.target_table = data.target_table;
    if (data.status !== undefined) patch.status = data.status;
    const { error } = await supabase.from("ingestion_classifications").update(patch).eq("id", data.classificationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------------------------------------------------------------------------
// approveGroup
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
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;
    const status = data.action === "exclude" ? "excluded" : "approved";
    const groupPatch: Record<string, unknown> = { status };
    const filePatch: Record<string, unknown> = { status };
    if (data.action === "change_type") {
      groupPatch.proposed_object_type = data.target_object_type;
      groupPatch.proposed_target_table = data.target_table;
      filePatch.target_object_type = data.target_object_type;
      filePatch.target_table = data.target_table;
    }
    const { data: group } = await supabase.from("ingestion_file_groups")
      .select("signature, proposed_object_type, proposed_target_table")
      .eq("id", data.groupId).single();

    await supabase.from("ingestion_file_groups").update(groupPatch).eq("id", data.groupId);
    await supabase.from("ingestion_classifications").update(filePatch).eq("group_id", data.groupId);

    if (data.action === "approve" && group?.proposed_object_type) {
      await supabase.from("ingestion_mapping_rules").insert({
        pattern_kind: "signature",
        pattern: group.signature,
        target_object_type: group.proposed_object_type,
        target_table: group.proposed_target_table,
        scope: "global",
        hit_count: 1,
        created_by: userId,
      });
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
    const supabase = context.supabase as AnyClient;
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
    const supabase = context.supabase as AnyClient;
    const { error } = await supabase.from("ingestion_object_suggestions").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------------------------------------------------------------------------
// detectConflicts — runs after Mapping is approved; produces ingestion_conflicts
// ----------------------------------------------------------------------------
export const detectConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const runId = data.runId;

    // Reset prior conflicts for this run
    await supabase.from("ingestion_conflicts").delete().eq("run_id", runId);

    const [{ data: classes }, { data: registry }] = await Promise.all([
      supabase
        .from("ingestion_classifications")
        .select("id, file_id, target_table, target_object_type, status, ingestion_files(filename, structure_json)")
        .eq("run_id", runId)
        .eq("status", "approved"),
      supabase
        .from("ingestion_object_registry")
        .select("object_type, target_table, conflict_key_fields")
        .eq("enabled", true),
    ]);

    type RegEntry = { object_type: string; target_table: string; conflict_key_fields: string[] | null };
    const regByType = new Map<string, RegEntry>();
    for (const r of (registry ?? []) as RegEntry[]) regByType.set(r.object_type, r);

    let inserted = 0;
    for (const c of (classes ?? []) as Array<{
      id: string; file_id: string; target_table: string | null; target_object_type: string | null;
      ingestion_files: { filename: string; structure_json: ParsedStructure } | null;
    }>) {
      if (!c.target_table || !c.target_object_type) continue;
      const reg = regByType.get(c.target_object_type);
      const keys = (reg?.conflict_key_fields ?? ["name"]).filter(Boolean);
      const struct = c.ingestion_files?.structure_json;
      const candidates = candidateRowsFromStructure(struct, c.ingestion_files?.filename ?? "");
      for (const candidate of candidates) {
        for (const key of keys) {
          const val = candidate[key];
          if (!val || typeof val !== "string" || !val.trim()) continue;
          try {
            const { data: existing } = await supabase
              .from(c.target_table)
              .select("id")
              .eq(key, val)
              .limit(1)
              .maybeSingle();
            if (existing?.id) {
              await supabase.from("ingestion_conflicts").insert({
                run_id: runId,
                file_id: c.file_id,
                target_table: c.target_table,
                existing_entity_id: existing.id,
                existing_entity_label: String(val).slice(0, 200),
                conflict_kind: `exact_${key}`,
                proposed_resolution: "needs_review",
                status: "open",
              });
              inserted++;
              break;
            }
          } catch {
            // table or column doesn't exist for this query — skip silently
          }
        }
      }
    }

    return { conflicts: inserted };
  });

function candidateRowsFromStructure(struct: ParsedStructure | undefined, filename: string): Array<Record<string, unknown>> {
  if (!struct) return [{ name: filename.replace(/\.[^.]+$/, "") }];
  if (struct.kind === "csv" && struct.columns && struct.sampleRows) {
    return struct.sampleRows.map((row) => {
      const obj: Record<string, unknown> = {};
      struct.columns!.forEach((col, i) => { if (row[i]) obj[col] = row[i]; });
      if (!obj.name) obj.name = filename.replace(/\.[^.]+$/, "");
      return obj;
    });
  }
  if (struct.kind === "markdown") {
    const obj: Record<string, unknown> = { ...(struct.frontmatter ?? {}) };
    if (!obj.name) obj.name = filename.replace(/\.[^.]+$/, "");
    return [obj];
  }
  return [{ name: filename.replace(/\.[^.]+$/, "") }];
}

// ----------------------------------------------------------------------------
// resolveConflict — set proposed_resolution + status
// ----------------------------------------------------------------------------
export const resolveConflict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; resolution: "create_new"|"update_existing"|"skip"|"merge"|"needs_review"; notes?: string }) =>
    z.object({
      id: z.string().uuid(),
      resolution: z.enum(["create_new","update_existing","skip","merge","needs_review"]),
      notes: z.string().max(500).optional(),
    }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const patch: Record<string, unknown> = {
      proposed_resolution: data.resolution,
      status: data.resolution === "needs_review" ? "open" : "resolved",
    };
    if (data.notes !== undefined) patch.resolution_notes = data.notes;
    const { error } = await supabase.from("ingestion_conflicts").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----------------------------------------------------------------------------
// runImport
// ----------------------------------------------------------------------------
export const runImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const runId = data.runId;

    await supabase.from("ingestion_runs").update({ status: "importing" }).eq("id", runId);
    await supabase.from("ingestion_results").delete().eq("run_id", runId);

    // Map of file_id → resolution decision (skip/update/create) from conflicts
    const { data: conflicts } = await supabase
      .from("ingestion_conflicts")
      .select("file_id, proposed_resolution, existing_entity_id, target_table")
      .eq("run_id", runId);
    const conflictByFile = new Map<string, { resolution: string; existing_entity_id: string | null; target_table: string }>();
    for (const c of (conflicts ?? []) as Array<{ file_id: string; proposed_resolution: string; existing_entity_id: string | null; target_table: string }>) {
      conflictByFile.set(c.file_id, { resolution: c.proposed_resolution, existing_entity_id: c.existing_entity_id, target_table: c.target_table });
    }

    const { data: classes } = await supabase
      .from("ingestion_classifications")
      .select("id, file_id, target_object_type, target_table, status, ingestion_files(filename, structure_json)")
      .eq("run_id", runId)
      .eq("status", "approved");

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const c of (classes ?? []) as Array<{
      id: string; file_id: string; target_object_type: string | null; target_table: string | null;
      ingestion_files: { filename: string; structure_json: ParsedStructure } | null;
    }>) {
      try {
        if (!c.target_table || !c.target_object_type) {
          await supabase.from("ingestion_results").insert({
            run_id: runId, file_id: c.file_id, status: "skipped",
            notes: "No target type/table",
          });
          skipped++;
          continue;
        }

        const conflict = conflictByFile.get(c.file_id);
        if (conflict?.resolution === "skip" || conflict?.resolution === "needs_review") {
          await supabase.from("ingestion_results").insert({
            run_id: runId, file_id: c.file_id, status: "skipped",
            notes: conflict.resolution === "skip" ? "Skipped via conflict resolution" : "Conflict unresolved",
          });
          skipped++;
          continue;
        }

        const file = c.ingestion_files;
        const struct = file?.structure_json;
        const rows = buildRowsForInsert(struct, c.target_object_type, file?.filename ?? "untitled");

        if (rows.length === 0) {
          await supabase.from("ingestion_results").insert({
            run_id: runId, file_id: c.file_id, status: "skipped",
            notes: "Could not derive any insertable row",
          });
          skipped++;
          continue;
        }

        if (conflict?.resolution === "update_existing" && conflict.existing_entity_id) {
          const { error: updErr } = await supabase
            .from(c.target_table)
            .update(rows[0])
            .eq("id", conflict.existing_entity_id);
          if (updErr) {
            await supabase.from("ingestion_results").insert({
              run_id: runId, file_id: c.file_id, status: "failed",
              error_message: updErr.message,
            });
            failed++;
            continue;
          }
          await supabase.from("ingestion_results").insert({
            run_id: runId, file_id: c.file_id, status: "updated",
            created_entity_kind: c.target_object_type,
            created_entity_id: conflict.existing_entity_id,
            created_entity_table: c.target_table,
            notes: "Updated existing entity via conflict resolution",
          });
          updated++;
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

function buildRowsForInsert(struct: ParsedStructure | undefined, _objectType: string, filename: string): Record<string, unknown>[] {
  if (!struct) return [];
  if (struct.kind === "csv" && struct.columns && struct.sampleRows) {
    return struct.sampleRows.map((row) => {
      const obj: Record<string, unknown> = {};
      struct.columns!.forEach((col, i) => {
        if (row[i] !== undefined && row[i] !== "") obj[col] = row[i];
      });
      ensureRequired(obj, filename);
      return obj;
    }).filter((r) => Object.keys(r).length > 0);
  }
  if (struct.kind === "markdown") {
    const obj: Record<string, unknown> = { ...(struct.frontmatter ?? {}) };
    ensureRequired(obj, filename);
    return [obj];
  }
  return [];
}

function ensureRequired(obj: Record<string, unknown>, filename: string) {
  const name = filename.replace(/\.[^.]+$/, "");
  if (!obj.name && !obj.campaign_name && !obj.decision) obj.name = name;
}

// ----------------------------------------------------------------------------
// Recipes
// ----------------------------------------------------------------------------
export const saveRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string; name: string; description?: string }) =>
    z.object({
      runId: z.string().uuid(),
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional(),
    }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const userId = context.userId;
    const { data: groups } = await supabase
      .from("ingestion_file_groups")
      .select("signature, proposed_object_type, proposed_target_table, status")
      .eq("run_id", data.runId);
    const signature_set = (groups ?? []).map((g: { signature: string; proposed_object_type: string | null; proposed_target_table: string | null; status: string }) => ({
      signature: g.signature,
      object_type: g.proposed_object_type,
      target_table: g.proposed_target_table,
      status: g.status,
    }));

    const { data: row, error } = await supabase.from("ingestion_recipes").insert({
      name: data.name,
      description: data.description ?? null,
      signature_set,
      field_aliases: {},
      conflict_defaults: {},
      hit_count: 0,
      created_by: userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { recipeId: row.id as string };
  });

export const listRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AnyClient;
    const { data, error } = await supabase
      .from("ingestion_recipes")
      .select("*")
      .order("hit_count", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { recipes: data ?? [] };
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const { error } = await supabase.from("ingestion_recipes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const applyRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string; recipeId: string }) =>
    z.object({ runId: z.string().uuid(), recipeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const { data: recipe } = await supabase.from("ingestion_recipes").select("signature_set, hit_count").eq("id", data.recipeId).single();
    if (!recipe) throw new Error("Recipe not found");
    const sigSet = (recipe.signature_set ?? []) as Array<{ signature: string; object_type: string | null; target_table: string | null; status: string }>;

    const { data: groups } = await supabase
      .from("ingestion_file_groups").select("id, signature").eq("run_id", data.runId);

    let applied = 0;
    for (const g of (groups ?? []) as Array<{ id: string; signature: string }>) {
      const match = sigSet.find((s) => s.signature === g.signature);
      if (!match || !match.object_type || !match.target_table) continue;
      await supabase.from("ingestion_file_groups").update({
        proposed_object_type: match.object_type,
        proposed_target_table: match.target_table,
        status: "approved",
      }).eq("id", g.id);
      await supabase.from("ingestion_classifications").update({
        target_object_type: match.object_type,
        target_table: match.target_table,
        status: "approved",
      }).eq("group_id", g.id);
      applied++;
    }

    await supabase.from("ingestion_recipes").update({ hit_count: ((recipe.hit_count ?? 0) as number) + 1 }).eq("id", data.recipeId);
    return { appliedGroups: applied };
  });

// ----------------------------------------------------------------------------
// Read paths
// ----------------------------------------------------------------------------
export const listIngestionRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AnyClient;
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
    const supabase = context.supabase as AnyClient;
    const [runRes, filesRes, groupsRes, classesRes, schemaRes, objRes, resultsRes, registryRes, rulesRes, conflictsRes, recipesRes] = await Promise.all([
      supabase.from("ingestion_runs").select("*").eq("id", data.runId).single(),
      supabase.from("ingestion_files").select("*").eq("run_id", data.runId).order("created_at"),
      supabase.from("ingestion_file_groups").select("*").eq("run_id", data.runId).order("sample_count", { ascending: false }),
      supabase.from("ingestion_classifications").select("*").eq("run_id", data.runId),
      supabase.from("ingestion_schema_suggestions").select("*").eq("run_id", data.runId).order("occurrence_count", { ascending: false }).limit(SCHEMA_SUGGESTION_CAP),
      supabase.from("ingestion_object_suggestions").select("*").eq("run_id", data.runId).limit(OBJECT_SUGGESTION_CAP),
      supabase.from("ingestion_results").select("*").eq("run_id", data.runId).order("created_at"),
      supabase.from("ingestion_object_registry").select("*").eq("enabled", true).order("sort_order"),
      supabase.from("ingestion_mapping_rules").select("*").order("hit_count", { ascending: false }).limit(50),
      supabase.from("ingestion_conflicts").select("*").eq("run_id", data.runId).order("created_at"),
      supabase.from("ingestion_recipes").select("*").order("hit_count", { ascending: false }).limit(20),
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
      conflicts: conflictsRes.data ?? [],
      recipes: recipesRes.data ?? [],
    };
  });

export const deleteMappingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnyClient;
    const { error } = await supabase.from("ingestion_mapping_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
