import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { sb as supabase } from "@/lib/sb";
import { useQueryClient } from "@tanstack/react-query";

interface Finding {
  severity: "low" | "medium" | "high";
  rule: string;
  message: string;
  file: string;
  line: number;
  fix_hint: string;
}

export interface UxAuditRun {
  id: string;
  route_path: string;
  source_path: string | null;
  audited_at: string;
  model: string | null;
  scores: Record<string, number>;
  findings: Finding[];
  guardrails_missing: string[];
  ux_issues_user_reported: string[];
  status: "open" | "acknowledged" | "fixed";
  notes: string | null;
}

const SCORE_KEYS: Array<{ key: string; label: string }> = [
  { key: "hierarchy", label: "Hierarchy" },
  { key: "density", label: "Density" },
  { key: "states", label: "States" },
  { key: "a11y", label: "A11y" },
  { key: "canon", label: "Canon" },
];

function scoreColor(n: number | undefined) {
  if (!n) return "bg-muted text-muted-foreground";
  if (n >= 4) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (n >= 3) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
}

function severityBadge(s: Finding["severity"]) {
  if (s === "high") return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (s === "medium") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

interface Props {
  run: UxAuditRun;
  onReaudit?: () => void;
  reauditing?: boolean;
}

export function UxAuditCard({ run, onReaudit, reauditing }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);

  const setStatus = async (status: UxAuditRun["status"]) => {
    setUpdating(true);
    await supabase.from("ux_audit_runs").update({ status }).eq("id", run.id);
    setUpdating(false);
    qc.invalidateQueries({ queryKey: ["ux_audit_runs"] });
  };

  const overall = Math.round(
    SCORE_KEYS.reduce((s, k) => s + (run.scores[k.key] ?? 0), 0) / SCORE_KEYS.length,
  );

  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", scoreColor(overall))}>
              {overall || "—"}/5
            </span>
            <span className="truncate text-sm font-medium">{run.route_path}</span>
            {run.status !== "open" && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {run.status}
              </span>
            )}
          </div>
          {run.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{run.notes}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SCORE_KEYS.map(({ key, label }) => (
              <span key={key} className={cn("rounded-md px-1.5 py-0.5 text-[10px]", scoreColor(run.scores[key]))}>
                {label} {run.scores[key] ?? "—"}
              </span>
            ))}
            {run.findings.length > 0 && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <FileWarning className="mr-1 inline h-3 w-3" />
                {run.findings.length} findings
              </span>
            )}
            {run.guardrails_missing.length > 0 && (
              <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-700 dark:text-rose-300">
                Missing: {run.guardrails_missing.join(", ")}
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {run.ux_issues_user_reported.length > 0 && (
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                User-reported issues
              </div>
              <ul className="space-y-1 text-xs">
                {run.ux_issues_user_reported.map((it, i) => (
                  <li key={i}>• {it}</li>
                ))}
              </ul>
            </div>
          )}

          {run.findings.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              No findings — page is canon-clean.
            </div>
          ) : (
            <ul className="space-y-2">
              {run.findings.map((f, i) => (
                <li key={i} className="rounded-xl border border-border bg-background/60 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", severityBadge(f.severity))}>
                      {f.severity}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.rule}</span>
                    <span className="ml-auto truncate text-[10px] text-muted-foreground">
                      {f.file}:{f.line}
                    </span>
                  </div>
                  <p className="text-xs">{f.message}</p>
                  {f.fix_hint && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      {f.fix_hint}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            {onReaudit && (
              <button
                type="button"
                onClick={onReaudit}
                disabled={reauditing}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {reauditing ? "Re-auditing…" : "Re-audit"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatus(run.status === "fixed" ? "open" : "fixed")}
              disabled={updating}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              {run.status === "fixed" ? "Mark open" : "Mark fixed"}
            </button>
            <button
              type="button"
              onClick={() => setStatus(run.status === "acknowledged" ? "open" : "acknowledged")}
              disabled={updating}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              {run.status === "acknowledged" ? "Un-acknowledge" : "Acknowledge"}
            </button>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {new Date(run.audited_at).toLocaleString()} · {run.model ?? "—"}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
