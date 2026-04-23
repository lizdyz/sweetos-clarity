import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/sb";
import { ShieldCheck, Wand2, Zap, RefreshCw, Loader2 } from "lucide-react";
import { UxAuditCard, type UxAuditRun } from "@/components/ux-audit-card";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/ux-audit")({
  component: UxAuditCockpit,
});

// Curated baseline set of routes worth auditing. Add more as the app grows.
const AUDIT_TARGETS: Array<{ route: string; source: string }> = [
  { route: "/today", source: "src/routes/_app.today.tsx" },
  { route: "/calendar", source: "src/routes/_app.calendar.tsx" },
  { route: "/capture", source: "src/routes/_app.capture.tsx" },
  { route: "/operate/ocda", source: "src/routes/_app.operate.ocda.tsx" },
  { route: "/sweetcycle", source: "src/routes/_app.sweetcycle.tsx" },
  { route: "/flightdeck", source: "src/routes/_app.flightdeck.tsx" },
  { route: "/sweetsync", source: "src/routes/_app.sweetsync.tsx" },
  { route: "/relationships", source: "src/routes/_app.relationships.index.tsx" },
  { route: "/relationships/$id", source: "src/routes/_app.relationships.$id.tsx" },
  { route: "/quests", source: "src/routes/_app.quests.index.tsx" },
  { route: "/quests/$id", source: "src/routes/_app.quests.$id.tsx" },
  { route: "/sparks/$id", source: "src/routes/_app.sparks.$id.tsx" },
  { route: "/components/$id", source: "src/routes/_app.components.$id.tsx" },
  { route: "/missions/$id", source: "src/routes/_app.missions.$id.tsx" },
  { route: "/measures", source: "src/routes/_app.measures.tsx" },
  { route: "/people", source: "src/routes/_app.people.tsx" },
  { route: "/vault", source: "src/routes/_app.vault.tsx" },
];

function UxAuditCockpit() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>(AUDIT_TARGETS[0].route);
  const [knownIssues, setKnownIssues] = useState("");
  const [running, setRunning] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["ux_audit_runs"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("ux_audit_runs")
        .select("*")
        .order("audited_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as UxAuditRun[];
    },
  });

  // Latest run per route
  const latestByRoute = useMemo(() => {
    const map = new Map<string, UxAuditRun>();
    for (const r of runs) {
      if (!map.has(r.route_path)) map.set(r.route_path, r);
    }
    return map;
  }, [runs]);

  const runAudit = async (route: string, sourcePath: string, issues: string[]) => {
    // Fetch source file as raw text via the dev server
    const fileRes = await fetch(`/${sourcePath}`);
    if (!fileRes.ok) {
      throw new Error(`Couldn't fetch ${sourcePath}`);
    }
    const sourceCode = await fileRes.text();
    const { data, error } = await supabase.functions.invoke("ux-audit", {
      body: { routePath: route, sourcePath, sourceCode, knownIssues: issues },
    });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  };

  const runOne = async (route: string, sourcePath: string, issues: string[]) => {
    setRunning(true);
    try {
      await runAudit(route, sourcePath, issues);
      toast.success(`Audited ${route}`);
      qc.invalidateQueries({ queryKey: ["ux_audit_runs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  const handleAuditOne = () => {
    const t = AUDIT_TARGETS.find((x) => x.route === selected);
    if (!t) return;
    const issues = knownIssues
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    runOne(t.route, t.source, issues);
  };

  /** Sequentially audit a list of targets (rate-limit-safe; AI ~2s each). */
  const runBulk = async (
    targets: Array<{ route: string; source: string }>,
    label: string,
  ) => {
    if (targets.length === 0) {
      toast.info(`Nothing to ${label}.`);
      return;
    }
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: targets.length });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      try {
        await runAudit(t.route, t.source, []);
        ok++;
      } catch (e) {
        fail++;
        console.error(`[bulk-audit] ${t.route} failed`, e);
      }
      setBulkProgress({ done: i + 1, total: targets.length });
      // small spacer between calls to be polite to AI quota
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 600));
    }
    qc.invalidateQueries({ queryKey: ["ux_audit_runs"] });
    setBulkRunning(false);
    setBulkProgress(null);
    if (fail === 0) toast.success(`${label}: ${ok}/${targets.length} audited`);
    else toast.warning(`${label}: ${ok} ok · ${fail} failed`);
  };

  const STALE_DAYS = 7;
  const now = Date.now();
  const isStale = (run: UxAuditRun | undefined) =>
    !run || now - new Date(run.audited_at).getTime() > STALE_DAYS * 86400_000;

  const staleTargets = AUDIT_TARGETS.filter((t) => isStale(latestByRoute.get(t.route)));
  const unauditedTargets = AUDIT_TARGETS.filter((t) => !latestByRoute.has(t.route));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[color:var(--iris-violet)]" />
            <h1 className="text-xl font-semibold">UI/UX Auditor</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Score any route against SweetBOS canon — Stage-as-Board, Views-are-Truth, TimeControls,
            CanonGuardrail, Domains/Tenets separation, semantic tokens. Manual fire only.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface/60 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Route to audit
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {AUDIT_TARGETS.map((t) => (
                <option key={t.route} value={t.route}>
                  {t.route}
                </option>
              ))}
            </select>
            <label className="block pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Known UX issues on this page (one per line — optional)
            </label>
            <textarea
              value={knownIssues}
              onChange={(e) => setKnownIssues(e.target.value)}
              rows={3}
              placeholder="e.g. Status select doesn't render as a board · Tenet chips overlap on mobile"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAuditOne}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--iris-violet)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-glass)] hover:opacity-90 disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              {running ? "Auditing…" : "Run audit"}
            </button>
          </div>
        </div>
      </section>

      {/* Bulk runner — fire many audits with one click. */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-iris-soft/40 to-surface/60 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[color:var(--iris-violet)]" />
              <h2 className="text-sm font-semibold">Bulk runner</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Audit many routes in one click. Runs sequentially (~2s each) to stay inside the AI rate limit.
            </p>
          </div>
          {bulkProgress && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-mono">
              <Loader2 className="h-3 w-3 animate-spin text-[color:var(--iris-violet)]" />
              {bulkProgress.done} / {bulkProgress.total}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runBulk(unauditedTargets, "Audit unaudited routes")}
            disabled={bulkRunning || unauditedTargets.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:border-foreground/30 disabled:opacity-40"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Audit unaudited ({unauditedTargets.length})
          </button>
          <button
            type="button"
            onClick={() => runBulk(staleTargets, `Refresh stale (>${STALE_DAYS}d)`)}
            disabled={bulkRunning || staleTargets.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:border-foreground/30 disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh stale &gt; {STALE_DAYS}d ({staleTargets.length})
          </button>
          <button
            type="button"
            onClick={() => runBulk(AUDIT_TARGETS, "Re-audit all")}
            disabled={bulkRunning}
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--iris-violet)] px-3 py-2 text-xs font-medium text-white shadow-[var(--shadow-glass)] hover:opacity-90 disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            Re-audit all ({AUDIT_TARGETS.length})
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Latest audit per route</h2>
          <span className="text-[10px] text-muted-foreground">{latestByRoute.size} routes audited</span>
        </div>
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-surface/60 p-6 text-sm text-muted-foreground">
            Loading audit history…
          </div>
        ) : latestByRoute.size === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            No audits yet. Pick a route above and run your first audit.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-surface/60 p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Canon misses by route (most off-canon first)
              </div>
              <ul className="divide-y divide-border">
                {Array.from(latestByRoute.values())
                  .map((r) => ({
                    route: r.route_path,
                    misses: (r.findings ?? []).filter((f) => f.detected_by === "presence_check").length,
                  }))
                  .sort((a, b) => b.misses - a.misses)
                  .map((row) => (
                    <li key={row.route} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="truncate font-mono">{row.route}</span>
                      <span
                        className={
                          row.misses === 0
                            ? "rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                            : "rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300"
                        }
                      >
                        {row.misses}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="space-y-2">
              {Array.from(latestByRoute.values()).map((run) => {
                const target = AUDIT_TARGETS.find((t) => t.route === run.route_path);
                return (
                  <UxAuditCard
                    key={run.id}
                    run={run}
                    reauditing={running || bulkRunning}
                    onReaudit={
                      target
                        ? () =>
                            runOne(
                              run.route_path,
                              target.source,
                              run.ux_issues_user_reported,
                            )
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
