import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import { sb } from "@/lib/sb";
import { Sparkles, Play, Clock, ArrowRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMeOperator } from "@/lib/use-me-operator";
import { rankNextActions, hrefForSubject, type RankedAction } from "@/lib/today-ranker";
import { HandoffSheet } from "@/components/handoff-sheet";

interface DecisionBarProps {
  /** Pre-computed ranked actions from parent (avoids double-fetch) */
  ranked: RankedAction[];
  /** Counts shown in the synthesized line */
  counts: {
    handoffs: number;
    overdue: number;
    ktiFires: number;
    approvals: number;
  };
  onShowMore: () => void;
}

export function TodayDecisionBar({ ranked, counts, onShowMore }: DecisionBarProps) {
  const me = useMeOperator();
  const [snoozing, setSnoozing] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const top = ranked[0];
  const linePieces = useMemo(() => {
    const parts: string[] = [];
    if (counts.handoffs > 0) parts.push(`${counts.handoffs} handoff${counts.handoffs === 1 ? "" : "s"} waiting on you`);
    if (counts.approvals > 0) parts.push(`${counts.approvals} approval${counts.approvals === 1 ? "" : "s"}`);
    if (counts.overdue > 0) parts.push(`${counts.overdue} overdue`);
    if (counts.ktiFires > 0) parts.push(`${counts.ktiFires} KTI fired in last 24h`);
    return parts;
  }, [counts]);

  const noOperator = !me.isLoading && !me.data;

  async function snoozeOneHour() {
    if (!top || top.subject_kind !== "task") return;
    setSnoozing(true);
    try {
      const notBefore = new Date(Date.now() + 60 * 60_000).toISOString();
      await sb.from("tasks").update({ not_before: notBefore }).eq("id", top.subject_id);
    } finally {
      setSnoozing(false);
    }
  }

  const topHref = top ? hrefForSubject(top.subject_kind, top.subject_id) : null;

  return (
    <section className="panel-raised mb-5 overflow-hidden">
      <div className="border-b border-border/50 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
            </div>
            {noOperator ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Showing all open team work.{" "}
                <Link to="/operators" className="text-[color:var(--iris-violet)] hover:underline">
                  Link your account to an Operator
                </Link>{" "}
                for a personalized brief.
              </p>
            ) : linePieces.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Inbox zero. Nothing waiting on you right now.</p>
            ) : (
              <p className="mt-1 text-sm text-foreground/90">{linePieces.join(" · ")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-iris-soft/30 px-5 py-4">
        {top && topHref ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={topHref.to as never}
              params={topHref.params as never}
              className="group inline-flex flex-1 min-w-0 items-center gap-2 rounded-xl bg-card px-4 py-3 shadow-sm transition hover:shadow-[var(--shadow-glow)]"
            >
              <Play className="h-4 w-4 shrink-0 text-[color:var(--iris-violet)] transition group-hover:translate-x-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Start with
                </span>
                <span className="block truncate text-sm font-semibold">{top.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {top.why} · {formatDistanceToNow(new Date(top.occurred_at), { addSuffix: true })}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>

            <Button
              variant="outline"
              size="sm"
              disabled={top.subject_kind !== "task" || snoozing}
              onClick={snoozeOneHour}
              title={top.subject_kind !== "task" ? "Snooze available on tasks for now" : "Push start time by 1 hour"}
            >
              <Clock className="h-3.5 w-3.5" />
              Snooze 1h
            </Button>

            {(top.subject_kind === "task" || top.subject_kind === "project" || top.subject_kind === "campaign" || top.subject_kind === "session") && (
              <HandoffSheet
                subjectKind={top.subject_kind}
                subjectId={top.subject_id}
                subjectLabel={top.title}
                fromOperatorId={me.data?.id ?? null}
                open={handoffOpen}
                onOpenChange={setHandoffOpen}
                trigger={
                  <Button variant="outline" size="sm">
                    Hand off
                  </Button>
                }
              />
            )}

            <Button variant="ghost" size="sm" onClick={onShowMore}>
              Show me 5 more
            </Button>
          </div>
        ) : (
          <Link
            to="/planner"
            className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-sm transition hover:shadow-[var(--shadow-glow)]"
          >
            <Inbox className="h-4 w-4 text-[color:var(--iris-violet)]" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Inbox zero</div>
              <div className="text-xs text-muted-foreground">Nothing pending. Want to plan tomorrow?</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * Tiny self-contained variant used by the Today route to compute counts
 * for the decision bar without re-fetching when the parent already has data.
 * Currently unused — exported for future reuse.
 */
export function useTodayCounts() {
  return useQuery({
    queryKey: ["today", "counts"],
    queryFn: async () => ({ ok: true }),
    enabled: false,
  });
}
