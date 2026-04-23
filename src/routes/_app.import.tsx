import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createIngestionRun,
  recordUploadedFile,
  analyzeRun,
  approveGroup,
  updateClassification,
  updateSchemaSuggestion,
  updateObjectSuggestion,
  runImport,
  getIngestionRun,
  deleteMappingRule,
} from "@/utils/ingestion.functions";

import { ImportStepper, type ImportStep } from "@/components/import/import-stepper";
import { UploadDropzone } from "@/components/import/upload-dropzone";
import { GroupCard, type GroupRow, type RegistryRow } from "@/components/import/group-card";
import { FileMappingRow, type ClassificationRow } from "@/components/import/file-mapping-row";
import { SchemaSuggestionCard, type SchemaSuggestion } from "@/components/import/schema-suggestion-card";
import { ObjectSuggestionCard, type ObjectSuggestion } from "@/components/import/object-suggestion-card";
import { RunProgressStrip } from "@/components/import/run-progress-strip";
import { ResultsTable, type ResultRow } from "@/components/import/results-table";
import { SavedRulesPanel, type MappingRuleRow } from "@/components/import/saved-rules-panel";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/import")({
  head: () => ({
    meta: [
      { title: "Import — SweetBOS" },
      { name: "description", content: "Bulk file ingestion: drop files, see groups, approve mappings, evolve your schema." },
    ],
  }),
  component: ImportPage,
});

type RunData = Awaited<ReturnType<typeof getIngestionRun>>;

function ImportPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [completed, setCompleted] = useState<Set<ImportStep>>(new Set());
  const [data, setData] = useState<RunData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const create = useServerFn(createIngestionRun);
  const record = useServerFn(recordUploadedFile);
  const analyze = useServerFn(analyzeRun);
  const groupAction = useServerFn(approveGroup);
  const classAction = useServerFn(updateClassification);
  const schemaAction = useServerFn(updateSchemaSuggestion);
  const objectAction = useServerFn(updateObjectSuggestion);
  const runIt = useServerFn(runImport);
  const fetchRun = useServerFn(getIngestionRun);
  const delRule = useServerFn(deleteMappingRule);

  const refresh = useCallback(async (id: string) => {
    const d = await fetchRun({ data: { runId: id } });
    setData(d);
  }, [fetchRun]);

  const ensureRun = useCallback(async () => {
    if (runId) return runId;
    const { runId: id } = await create({ data: {} });
    setRunId(id);
    return id;
  }, [runId, create]);

  const onUpload = useCallback(async (file: File) => {
    const id = await ensureRun();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("Not signed in");
    const buf = await file.arrayBuffer();
    const sha256 = await sha256Hex(buf);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${id}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("ingestion").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (up.error) throw new Error(up.error.message);
    const res = await record({ data: {
      runId: id, storagePath: path, filename: file.name,
      mimeType: file.type || undefined, sizeBytes: file.size, sha256,
    }});
    return { duplicate: res.duplicate };
  }, [ensureRun, record]);

  const goAnalyze = useCallback(async () => {
    if (!runId) return;
    setBusy("analyze");
    try {
      await analyze({ data: { runId } });
      await refresh(runId);
      setStep("analysis");
      setCompleted((c) => new Set([...c, "upload"]));
    } catch (e) {
      toast.error("Analysis failed", { description: String(e).slice(0, 200) });
    } finally { setBusy(null); }
  }, [runId, analyze, refresh]);

  const onGroupAction = useCallback(async (groupId: string, action: "approve" | "exclude" | "change_type", payload?: { target_object_type: string; target_table: string }) => {
    await groupAction({ data: { groupId, action, ...(payload ?? {}) } });
    if (runId) await refresh(runId);
  }, [groupAction, runId, refresh]);

  const onClassChange = useCallback(async (id: string, patch: Parameters<typeof classAction>[0]["data"]) => {
    await classAction({ data: { ...patch, classificationId: id } });
    if (runId) await refresh(runId);
  }, [classAction, runId, refresh]);

  const doRunImport = useCallback(async () => {
    if (!runId) return;
    setBusy("import");
    try {
      const res = await runIt({ data: { runId } });
      toast.success("Import complete", { description: `${res.created} created · ${res.skipped} skipped · ${res.failed} failed` });
      await refresh(runId);
      setStep("results");
      setCompleted((c) => new Set([...c, "import", "schema", "mapping"]));
    } catch (e) {
      toast.error("Import failed", { description: String(e).slice(0, 200) });
    } finally { setBusy(null); }
  }, [runId, runIt, refresh]);

  const startNew = useCallback(() => {
    setRunId(null);
    setStep("upload");
    setCompleted(new Set());
    setData(null);
  }, []);

  const filenameOf = useMemo(() => {
    const map = new Map((data?.files ?? []).map((f: any) => [f.id as string, f.filename as string]));
    return (id: string) => map.get(id) ?? "—";
  }, [data?.files]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[color:var(--iris-violet)]" />
            Smart Ingestion
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Drop a folder of files. We group, classify, and propose where each one belongs — only asking when it matters.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowRules((v) => !v)}>
            {showRules ? "Hide saved rules" : "Saved rules"}
          </Button>
          {runId && <Button variant="ghost" size="sm" onClick={startNew}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />New run</Button>}
        </div>
      </header>

      <RunProgressStrip
        fileCount={data?.run?.file_count ?? 0}
        groupCount={data?.run?.group_count ?? 0}
        schemaCount={data?.run?.schema_suggestion_count ?? 0}
        objectCount={data?.run?.object_suggestion_count ?? 0}
        status={data?.run?.status ?? "draft"}
      />

      <ImportStepper active={step} onSelect={setStep} completed={completed} />

      {showRules && (
        <SavedRulesPanel
          rules={(data?.mappingRules ?? []) as MappingRuleRow[]}
          onDelete={async (id) => { await delRule({ data: { id } }); if (runId) refresh(runId); }}
        />
      )}

      {step === "upload" && (
        <section className="space-y-4">
          <UploadDropzone onUpload={onUpload} />
          <div className="flex items-center justify-end">
            <Button onClick={goAnalyze} disabled={!runId || busy === "analyze"}>
              {busy === "analyze" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Analyze {data?.run?.file_count ? `${data.run.file_count} files` : ""}
            </Button>
          </div>
        </section>
      )}

      {step === "analysis" && (
        <section className="space-y-3">
          {(!data?.groups || data.groups.length === 0) ? (
            <Empty msg="Run analysis to see groups." />
          ) : (
            <div className="space-y-3">
              {(data.groups as GroupRow[]).map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  registry={(data.registry ?? []) as RegistryRow[]}
                  onApprove={() => onGroupAction(g.id, "approve")}
                  onExclude={() => onGroupAction(g.id, "exclude")}
                  onChangeType={(ot, tt) => onGroupAction(g.id, "change_type", { target_object_type: ot, target_table: tt })}
                />
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep("upload")}>Back</Button>
            <Button onClick={() => { setStep("mapping"); setCompleted((c) => new Set([...c, "analysis"])); }}>Continue → Mapping</Button>
          </div>
        </section>
      )}

      {step === "mapping" && (
        <section className="space-y-3">
          <div className="overflow-hidden rounded-2xl border bg-card/40">
            <table className="w-full">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">File</th>
                  <th className="px-3 py-2 text-left">Object type</th>
                  <th className="px-3 py-2 text-left">Fields</th>
                  <th className="px-3 py-2 text-left">Confidence</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.classifications ?? []).map((c: any) => (
                  <FileMappingRow
                    key={c.id}
                    filename={filenameOf(c.file_id)}
                    classification={c as ClassificationRow}
                    registry={(data?.registry ?? []) as RegistryRow[]}
                    onChange={(patch) => onClassChange(c.id, patch as any)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep("analysis")}>Back</Button>
            <Button onClick={() => { setStep("schema"); setCompleted((c) => new Set([...c, "mapping"])); }}>Continue → Schema</Button>
          </div>
        </section>
      )}

      {step === "schema" && (
        <section className="space-y-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Suggested new fields</h2>
            {(data?.schemaSuggestions?.length ?? 0) === 0 ? (
              <Empty msg="No unmatched columns. Your existing schema covered everything." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(data!.schemaSuggestions as SchemaSuggestion[]).map((s) => (
                  <SchemaSuggestionCard
                    key={s.id}
                    s={s}
                    onApprove={async (name) => { await schemaAction({ data: { id: s.id, status: "approved", approved_field_name: name } }); if (runId) refresh(runId); }}
                    onSkip={async () => { await schemaAction({ data: { id: s.id, status: "skipped" } }); if (runId) refresh(runId); }}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Possible new object types</h2>
            {(data?.objectSuggestions?.length ?? 0) === 0 ? (
              <Empty msg="Nothing here — every coherent shape mapped to a known type." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(data!.objectSuggestions as ObjectSuggestion[]).map((s) => (
                  <ObjectSuggestionCard
                    key={s.id}
                    s={s}
                    onApprove={async () => { await objectAction({ data: { id: s.id, status: "approved" } }); if (runId) refresh(runId); }}
                    onSkip={async () => { await objectAction({ data: { id: s.id, status: "skipped" } }); if (runId) refresh(runId); }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep("mapping")}>Back</Button>
            <Button onClick={() => { setStep("import"); setCompleted((c) => new Set([...c, "schema"])); }}>Continue → Import</Button>
          </div>
        </section>
      )}

      {step === "import" && (
        <section className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-iris/5 to-card/60 p-6">
            <h2 className="text-lg font-semibold">Ready to import</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only files marked <em>Approved</em> will be created in your workspace. Excluded and needs-review files are left alone.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button size="lg" onClick={doRunImport} disabled={busy === "import"}>
                {busy === "import" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Run import
              </Button>
              <span className="text-xs text-muted-foreground">
                {(data?.classifications ?? []).filter((c: any) => c.status === "approved").length} files approved
              </span>
            </div>
          </div>
        </section>
      )}

      {step === "results" && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Created" value={data?.run?.created_count ?? 0} tone="emerald" />
            <Stat label="Updated" value={data?.run?.updated_count ?? 0} tone="sky" />
            <Stat label="Skipped" value={data?.run?.skipped_count ?? 0} tone="muted" />
            <Stat label="Failed"  value={data?.run?.failed_count ?? 0}  tone="rose" />
          </div>
          <ResultsTable results={(data?.results ?? []) as ResultRow[]} filenameOf={filenameOf} />
        </section>
      )}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">{msg}</div>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "sky" | "muted" | "rose" }) {
  const toneClass =
    tone === "emerald" ? "text-emerald-600" :
    tone === "sky" ? "text-sky-600" :
    tone === "rose" ? "text-rose-600" :
    "text-foreground";
  return (
    <div className="rounded-2xl border bg-card/40 p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
