import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createIngestionRun,
  recordUploadedFile,
  analyzeRun,
  analyzeChunk,
  approveGroup,
  updateClassification,
  updateSchemaSuggestion,
  updateObjectSuggestion,
  detectConflicts,
  resolveConflict,
  runImport,
  getIngestionRun,
  deleteMappingRule,
  saveRecipe,
  applyRecipe,
  deleteRecipe,
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
import { AnalysisProgress } from "@/components/import/analysis-progress";
import { ConflictCard, type ConflictRow } from "@/components/import/conflict-card";
import { RecipeMatchBanner } from "@/components/import/recipe-match-banner";
import { SaveRecipeDialog } from "@/components/import/save-recipe-dialog";
import { RecipesPanel, type RecipeRow } from "@/components/import/recipes-panel";
import { LineageStrip } from "@/components/import/lineage-strip";
import { sampleBatchSourcePathFor } from "@/fixtures/ingestion-sample";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, PlayCircle, RotateCcw, AlertTriangle, BookmarkPlus } from "lucide-react";
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
  const [showRecipes, setShowRecipes] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ analyzed: number; total: number } | null>(null);
  const [recipeDismissed, setRecipeDismissed] = useState<Set<string>>(new Set());
  const [saveRecipeOpen, setSaveRecipeOpen] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const create = useServerFn(createIngestionRun);
  const record = useServerFn(recordUploadedFile);
  const analyze = useServerFn(analyzeRun);
  const chunk = useServerFn(analyzeChunk);
  const groupAction = useServerFn(approveGroup);
  const classAction = useServerFn(updateClassification);
  const schemaAction = useServerFn(updateSchemaSuggestion);
  const objectAction = useServerFn(updateObjectSuggestion);
  const detectConf = useServerFn(detectConflicts);
  const resolveConf = useServerFn(resolveConflict);
  const runIt = useServerFn(runImport);
  const fetchRun = useServerFn(getIngestionRun);
  const delRule = useServerFn(deleteMappingRule);
  const saveRecipeFn = useServerFn(saveRecipe);
  const applyRecipeFn = useServerFn(applyRecipe);
  const delRecipeFn = useServerFn(deleteRecipe);

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
      cacheControl: "3600", upsert: false, contentType: file.type || undefined,
    });
    if (up.error) throw new Error(up.error.message);
    const sourcePath = sampleBatchSourcePathFor(file.name) ?? file.name;
    const res = await record({ data: {
      runId: id, storagePath: path, filename: file.name, sourcePath,
      mimeType: file.type || undefined, sizeBytes: file.size, sha256,
    }});
    return { duplicate: res.duplicate };
  }, [ensureRun, record]);

  // Chunked analyze loop with progress
  const goAnalyze = useCallback(async () => {
    if (!runId) return;
    setBusy("analyze");
    setStepError(null);
    try {
      const { total, chunkSize } = await analyze({ data: { runId } });
      setAnalysisProgress({ analyzed: 0, total });
      let offset = 0;
      let done = total === 0;
      while (!done) {
        const r = await chunk({ data: { runId, offset, limit: chunkSize } });
        offset = r.nextOffset;
        setAnalysisProgress({ analyzed: r.analyzed, total: r.total });
        done = r.done;
        if (r.processed === 0) break;
      }
      await refresh(runId);
      setStep("analysis");
      setCompleted((c) => new Set([...c, "upload"]));
    } catch (e) {
      const msg = String(e).slice(0, 240);
      setStepError(msg);
      toast.error("Analysis failed", { description: msg });
    } finally {
      setBusy(null);
      setAnalysisProgress(null);
    }
  }, [runId, analyze, chunk, refresh]);

  const onGroupAction = useCallback(async (groupId: string, action: "approve" | "exclude" | "change_type", payload?: { target_object_type: string; target_table: string }) => {
    await groupAction({ data: { groupId, action, ...(payload ?? {}) } });
    if (runId) await refresh(runId);
  }, [groupAction, runId, refresh]);

  const onClassChange = useCallback(async (id: string, patch: { target_object_type?: string | null; target_table?: string | null; status?: ClassificationRow["status"] }) => {
    await classAction({ data: { ...patch, classificationId: id } });
    if (runId) await refresh(runId);
  }, [classAction, runId, refresh]);

  const goConflicts = useCallback(async () => {
    if (!runId) return;
    setBusy("conflicts");
    setStepError(null);
    try {
      const r = await detectConf({ data: { runId } });
      await refresh(runId);
      setCompleted((c) => new Set([...c, "mapping"]));
      if (r.conflicts === 0) {
        toast.success("No conflicts found", { description: "Nothing collides with existing entities." });
        setStep("schema");
        setCompleted((c) => new Set([...c, "conflicts"]));
      } else {
        toast.message(`${r.conflicts} conflict${r.conflicts === 1 ? "" : "s"} need review`);
        setStep("conflicts");
      }
    } catch (e) {
      setStepError(String(e).slice(0, 240));
      toast.error("Conflict detection failed");
    } finally { setBusy(null); }
  }, [runId, detectConf, refresh]);

  const onResolveConflict = useCallback(async (id: string, resolution: ConflictRow["proposed_resolution"]) => {
    await resolveConf({ data: { id, resolution } });
    if (runId) await refresh(runId);
  }, [resolveConf, runId, refresh]);

  const doRunImport = useCallback(async () => {
    if (!runId) return;
    setBusy("import");
    setStepError(null);
    try {
      const res = await runIt({ data: { runId } });
      toast.success("Import complete", { description: `${res.created} created · ${res.updated} updated · ${res.skipped} skipped · ${res.failed} failed` });
      await refresh(runId);
      setStep("results");
      setCompleted((c) => new Set([...c, "import", "schema", "mapping", "conflicts"]));
    } catch (e) {
      setStepError(String(e).slice(0, 240));
      toast.error("Import failed", { description: String(e).slice(0, 200) });
    } finally { setBusy(null); }
  }, [runId, runIt, refresh]);

  const onSaveRecipe = useCallback(async (name: string, description: string) => {
    if (!runId) return;
    await saveRecipeFn({ data: { runId, name, description } });
    toast.success("Recipe saved", { description: "Future imports of the same shape will skip most review." });
    if (runId) await refresh(runId);
  }, [runId, saveRecipeFn, refresh]);

  const onApplyRecipe = useCallback(async (recipeId: string) => {
    if (!runId) return;
    const r = await applyRecipeFn({ data: { runId, recipeId } });
    toast.success(`Applied recipe`, { description: `${r.appliedGroups} group(s) pre-approved` });
    await refresh(runId);
  }, [runId, applyRecipeFn, refresh]);

  const startNew = useCallback(() => {
    setRunId(null); setStep("upload"); setCompleted(new Set()); setData(null);
    setRecipeDismissed(new Set()); setStepError(null);
  }, []);

  const filenameOf = useMemo(() => {
    const map = new Map<string, string>(((data?.files ?? []) as Array<{ id: string; filename: string }>).map((f) => [f.id, f.filename]));
    return (id: string): string => map.get(id) ?? "—";
  }, [data?.files]);

  const fileIndex = useMemo(() => {
    const m = new Map<string, { filename: string; source_path: string | null; size_bytes: number | null; sha256: string | null; group_id: string | null }>();
    for (const f of (data?.files ?? []) as Array<{ id: string; filename: string; source_path: string | null; size_bytes: number | null; sha256: string | null; group_id: string | null }>) {
      m.set(f.id, f);
    }
    return m;
  }, [data?.files]);

  const groupIndex = useMemo(() => {
    const m = new Map<string, { pattern_label: string | null; rationale: string | null }>();
    for (const g of (data?.groups ?? []) as Array<{ id: string; pattern_label: string | null; rationale: string | null }>) {
      m.set(g.id, g);
    }
    return m;
  }, [data?.groups]);

  const resultIndex = useMemo(() => {
    const m = new Map<string, { created_entity_table: string | null; created_entity_id: string | null; created_entity_kind: string | null }>();
    for (const r of (data?.results ?? []) as Array<{ file_id: string; created_entity_table: string | null; created_entity_id: string | null; created_entity_kind: string | null }>) {
      m.set(r.file_id, r);
    }
    return m;
  }, [data?.results]);

  // Recipe matching: score saved recipes against current group signatures
  const recipeMatch = useMemo(() => {
    const groups = (data?.groups ?? []) as Array<{ signature: string }>;
    const recipes = (data?.recipes ?? []) as RecipeRow[];
    if (groups.length === 0 || recipes.length === 0) return null;
    const sigs = new Set(groups.map((g) => g.signature));
    let best: { id: string; name: string; matched: number; total: number } | null = null;
    for (const r of recipes) {
      if (recipeDismissed.has(r.id)) continue;
      const sigSet = (Array.isArray(r.signature_set) ? r.signature_set : []) as Array<{ signature: string }>;
      const matched = sigSet.filter((s) => sigs.has(s.signature)).length;
      const total = Math.max(sigSet.length, 1);
      const ratio = matched / total;
      if (ratio >= 0.75 && (!best || matched > best.matched)) {
        best = { id: r.id, name: r.name, matched, total };
      }
    }
    return best;
  }, [data?.groups, data?.recipes, recipeDismissed]);

  const conflictsOpen = ((data?.conflicts ?? []) as ConflictRow[]).filter((c) => c.status === "open" && c.proposed_resolution === "needs_review").length;

  const lineageFor = useCallback((fileId: string, classification?: { target_table: string | null; target_object_type: string | null; rationale: string | null }) => {
    const f = fileIndex.get(fileId);
    const g = f?.group_id ? groupIndex.get(f.group_id) : null;
    const r = resultIndex.get(fileId);
    return {
      filename: f?.filename ?? "—",
      source_path: f?.source_path ?? null,
      size_bytes: f?.size_bytes ?? null,
      sha256: f?.sha256 ?? null,
      group_label: g?.pattern_label ?? null,
      group_rationale: g?.rationale ?? null,
      mapping_rationale: classification?.rationale ?? null,
      target_table: r?.created_entity_table ?? classification?.target_table ?? null,
      target_object_type: r?.created_entity_kind ?? classification?.target_object_type ?? null,
      destination_entity_id: r?.created_entity_id ?? null,
    };
  }, [fileIndex, groupIndex, resultIndex]);

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
          <Button variant="ghost" size="sm" onClick={() => setShowRecipes((v) => !v)}>
            {showRecipes ? "Hide recipes" : "Recipes"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowRules((v) => !v)}>
            {showRules ? "Hide rules" : "Saved rules"}
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

      <ImportStepper active={step} onSelect={setStep} completed={completed} conflictsCount={conflictsOpen} />

      {showRecipes && (
        <RecipesPanel
          recipes={(data?.recipes ?? []) as RecipeRow[]}
          onDelete={async (id) => { await delRecipeFn({ data: { id } }); if (runId) refresh(runId); }}
        />
      )}

      {showRules && (
        <SavedRulesPanel
          rules={(data?.mappingRules ?? []) as MappingRuleRow[]}
          onDelete={async (id) => { await delRule({ data: { id } }); if (runId) refresh(runId); }}
        />
      )}

      {stepError && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-600" />
          <div className="flex-1">
            <div className="font-semibold text-rose-700">Step failed</div>
            <div className="text-rose-700/80">{stepError}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setStepError(null)}>Dismiss</Button>
        </div>
      )}

      {step === "upload" && (
        <section className="space-y-4">
          <UploadDropzone onUpload={onUpload} />
          {analysisProgress && (
            <AnalysisProgress analyzed={analysisProgress.analyzed} total={analysisProgress.total} />
          )}
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
          {recipeMatch && (
            <RecipeMatchBanner
              match={recipeMatch}
              onApply={() => onApplyRecipe(recipeMatch.id)}
              onDismiss={() => setRecipeDismissed((s) => new Set([...s, recipeMatch.id]))}
            />
          )}
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
                {((data?.classifications ?? []) as Array<ClassificationRow & { rationale: string | null }>).map((c) => (
                  <FileMappingRow
                    key={c.id}
                    filename={filenameOf(c.file_id)}
                    classification={c}
                    registry={(data?.registry ?? []) as RegistryRow[]}
                    onChange={(patch) => onClassChange(c.id, patch)}
                    lineage={lineageFor(c.file_id, c)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep("analysis")}>Back</Button>
            <Button onClick={goConflicts} disabled={busy === "conflicts"}>
              {busy === "conflicts" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue → Check conflicts
            </Button>
          </div>
        </section>
      )}

      {step === "conflicts" && (
        <section className="space-y-3">
          {((data?.conflicts ?? []) as ConflictRow[]).length === 0 ? (
            <Empty msg="No conflicts detected — nothing collides with existing entities." />
          ) : (
            <div className="space-y-2">
              {((data?.conflicts ?? []) as ConflictRow[]).map((c) => (
                <ConflictCard
                  key={c.id}
                  conflict={c}
                  filename={filenameOf(c.file_id)}
                  onResolve={(r) => onResolveConflict(c.id, r)}
                />
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep("mapping")}>Back</Button>
            <Button onClick={() => { setStep("schema"); setCompleted((c) => new Set([...c, "conflicts"])); }}>Continue → Schema</Button>
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
            <Button variant="ghost" onClick={() => setStep("conflicts")}>Back</Button>
            <Button onClick={() => { setStep("import"); setCompleted((c) => new Set([...c, "schema"])); }}>Continue → Import</Button>
          </div>
        </section>
      )}

      {step === "import" && (
        <section className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-iris/5 to-card/60 p-6">
            <h2 className="text-lg font-semibold">Ready to import</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only files marked <em>Approved</em> will be created in your workspace. Conflicts default to <em>needs review</em> — those files are skipped unless you explicitly chose to update or create.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button size="lg" onClick={doRunImport} disabled={busy === "import"}>
                {busy === "import" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Run import
              </Button>
              <span className="text-xs text-muted-foreground">
                {(data?.classifications ?? []).filter((c: { status: string }) => c.status === "approved").length} files approved
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
          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setSaveRecipeOpen(true)}>
              <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" />
              Save run as recipe
            </Button>
          </div>
          <ResultsTable
            results={(data?.results ?? []) as ResultRow[]}
            filenameOf={filenameOf}
            lineageFor={(fid) => lineageFor(fid)}
          />
        </section>
      )}

      <SaveRecipeDialog open={saveRecipeOpen} onOpenChange={setSaveRecipeOpen} onSave={onSaveRecipe} />
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
