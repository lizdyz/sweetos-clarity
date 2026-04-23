// Right-rail panel mounted on a decision detail page. Shows what raised the
// decision (upstream) and what it affects (downstream). Decisions are the
// pivot of the OCDA loop — this rail makes that visible.

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Sparkles } from "lucide-react";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { OCDAStageChip } from "@/components/ocda-stage-chip";

interface DecisionImpactRailProps {
  decisionId: string;
  className?: string;
}

interface DecisionRow {
  id: string;
  decision: string;
  status: string | null;
  ocda_stage: string | null;
  raised_from_kind: string | null;
  raised_from_id: string | null;
  supersedes: string | null;
  related_project_id: string | null;
  tagged_components: string[] | null;
  tagged_domains: string[] | null;
}

const KIND_LABEL: Record<string, string> = {
  capture: "Capture",
  proposal: "Proposal",
  spark: "Spark",
  sandbox_item: "Sandbox item",
  kti: "KTI fire",
  kti_scan: "KTI fire",
  inbound_signal: "Inbound signal",
  open_decision: "Open decision",
  task: "Task",
  project: "Project",
};

const KIND_ROUTE: Record<string, (id: string) => string> = {
  proposal: (id) => `/queue?proposal=${id}`,
  spark: (id) => `/sparks/${id}`,
  sandbox_item: () => `/sandbox`,
  kti: (id) => `/library/ktis/${id}`,
  kti_scan: () => `/library/ktis`,
  inbound_signal: () => `/sweetscan`,
  open_decision: () => `/decisions/open`,
  task: (id) => `/tasks/${id}`,
  project: (id) => `/projects/${id}`,
  capture: () => `/capture`,
};

export function DecisionImpactRail({ decisionId, className }: DecisionImpactRailProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["decision-impact", decisionId],
    queryFn: async () => {
      const { data: dec } = await sb
        .from("decisions")
        .select(
          "id, decision, status, ocda_stage, raised_from_kind, raised_from_id, supersedes, related_project_id, tagged_components, tagged_domains",
        )
        .eq("id", decisionId)
        .maybeSingle();

      const decision = dec as DecisionRow | null;
      if (!decision) return null;

      // Downstream: tasks linked back via spawned_by_id, open_decisions settled by it
      const [tasksLinked, settledOpen, supersededBy] = await Promise.all([
        sb
          .from("tasks")
          .select("id, name")
          .eq("spawned_by_kind", "decision")
          .eq("spawned_by_id", decisionId)
          .limit(20),
        sb
          .from("open_decisions")
          .select("id, title")
          .eq("settled_decision_id", decisionId)
          .limit(20),
        sb
          .from("decisions")
          .select("id, decision")
          .eq("supersedes", decisionId)
          .limit(10),
      ]);

      // Upstream: the row that raised this decision, the decision it supersedes
      let raisedFromLabel: string | null = null;
      if (decision.raised_from_kind && decision.raised_from_id) {
        raisedFromLabel = await fetchUpstreamLabel(
          decision.raised_from_kind,
          decision.raised_from_id,
        );
      }
      let supersedesRow: { id: string; decision: string } | null = null;
      if (decision.supersedes) {
        const { data: r } = await sb
          .from("decisions")
          .select("id, decision")
          .eq("id", decision.supersedes)
          .maybeSingle();
        supersedesRow = (r as { id: string; decision: string } | null) ?? null;
      }

      return {
        decision,
        raisedFromLabel,
        supersedesRow,
        tasksLinked: (tasksLinked.data ?? []) as { id: string; name: string }[],
        settledOpen: (settledOpen.data ?? []) as { id: string; title: string }[],
        supersededBy: (supersededBy.data ?? []) as { id: string; decision: string }[],
      };
    },
  });

  if (isLoading) {
    return (
      <aside className={cn("rounded-2xl border bg-surface/40 p-4 text-xs text-muted-foreground", className)}>
        Loading impact…
      </aside>
    );
  }
  if (!data) return null;
  const { decision, raisedFromLabel, supersedesRow, tasksLinked, settledOpen, supersededBy } = data;

  const upstreamHref =
    decision.raised_from_kind && decision.raised_from_id
      ? KIND_ROUTE[decision.raised_from_kind]?.(decision.raised_from_id)
      : null;

  return (
    <aside className={cn("space-y-4 rounded-2xl border bg-surface/40 p-4", className)}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Decision impact
        </h3>
        <OCDAStageChip
          subjectTable="decisions"
          subjectId={decision.id}
          stage={decision.ocda_stage}
          invalidate={[["decision-impact", decision.id], ["decisions", "header", decision.id]]}
        />
      </header>

      {/* UPSTREAM */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <ArrowUpRight className="h-3 w-3" /> Upstream
        </div>
        <ul className="space-y-1 text-xs">
          {raisedFromLabel ? (
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Raised by</span>
              {upstreamHref ? (
                <Link to={upstreamHref} className="inline-flex items-center gap-1 truncate font-medium text-iris hover:underline">
                  {KIND_LABEL[decision.raised_from_kind!] ?? decision.raised_from_kind}: {raisedFromLabel}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <span className="truncate font-medium">
                  {KIND_LABEL[decision.raised_from_kind!] ?? decision.raised_from_kind}: {raisedFromLabel}
                </span>
              )}
            </li>
          ) : (
            <li className="text-muted-foreground/70">Not linked to any upstream signal.</li>
          )}
          {supersedesRow && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Supersedes</span>
              <Link
                to="/decisions/$id"
                params={{ id: supersedesRow.id }}
                className="inline-flex items-center gap-1 truncate font-medium text-iris hover:underline"
              >
                {supersedesRow.decision}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          )}
        </ul>
      </section>

      {/* DOWNSTREAM */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <ArrowDownRight className="h-3 w-3" /> Downstream
        </div>
        <ul className="space-y-1 text-xs">
          <li className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Affects</span>
            <span className="font-medium">
              {tasksLinked.length} {tasksLinked.length === 1 ? "task" : "tasks"} ·{" "}
              {decision.tagged_components?.length ?? 0} components ·{" "}
              {decision.tagged_domains?.length ?? 0} domains
            </span>
          </li>
          {decision.related_project_id && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Project</span>
              <Link
                to="/projects/$id"
                params={{ id: decision.related_project_id }}
                className="inline-flex items-center gap-1 font-medium text-iris hover:underline"
              >
                Open
                <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          )}
          {settledOpen.length > 0 && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Settles open</span>
              <span className="font-medium">{settledOpen.length}</span>
            </li>
          )}
          {supersededBy.length > 0 && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Superseded by</span>
              <Link
                to="/decisions/$id"
                params={{ id: supersededBy[0].id }}
                className="inline-flex items-center gap-1 truncate font-medium text-iris hover:underline"
              >
                {supersededBy[0].decision}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          )}
        </ul>
      </section>

      {/* QUICK LINKS */}
      {tasksLinked.length > 0 && (
        <section className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Spawned tasks
          </div>
          <ul className="space-y-0.5">
            {tasksLinked.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  to="/tasks/$id"
                  params={{ id: t.id }}
                  className="inline-flex items-center gap-1 text-xs text-iris hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

async function fetchUpstreamLabel(kind: string, id: string): Promise<string | null> {
  try {
    if (kind === "open_decision") {
      const { data } = await sb.from("open_decisions").select("title").eq("id", id).maybeSingle();
      return (data as { title: string } | null)?.title ?? null;
    }
    if (kind === "spark") {
      const { data } = await sb.from("sparks").select("name").eq("id", id).maybeSingle();
      return (data as { name: string } | null)?.name ?? null;
    }
    if (kind === "task") {
      const { data } = await sb.from("tasks").select("name").eq("id", id).maybeSingle();
      return (data as { name: string } | null)?.name ?? null;
    }
    if (kind === "project") {
      const { data } = await sb.from("projects").select("name").eq("id", id).maybeSingle();
      return (data as { name: string } | null)?.name ?? null;
    }
    if (kind === "kti" || kind === "kti_scan") {
      const { data } = await sb
        .from("key_trend_indicators")
        .select("name")
        .eq("id", id)
        .maybeSingle();
      return (data as { name: string } | null)?.name ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
