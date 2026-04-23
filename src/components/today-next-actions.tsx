import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { sb } from "@/lib/sb";
import {
  CheckSquare, FolderKanban, CalendarClock, Megaphone, Workflow as WorkflowIcon,
  Flame, Clock, Zap, Radio, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WalkMenu } from "@/components/walk-menu";
import { HandoffSheet } from "@/components/handoff-sheet";
import { respondToHandoff } from "@/lib/handoffs";
import { hrefForSubject, type RankedAction, type RankedSourceKind } from "@/lib/today-ranker";
import type { WalkKind } from "@/lib/walk-menu-resolvers";

const SOURCE_META: Record<RankedSourceKind, { icon: typeof Flame; label: string; tone: string }> = {
  handoff:   { icon: WorkflowIcon, label: "handoff",  tone: "text-amber-600 dark:text-amber-400" },
  approval:  { icon: Zap,          label: "approval", tone: "text-iris" },
  overdue:   { icon: Clock,        label: "overdue",  tone: "text-rose-600 dark:text-rose-400" },
  kti_fire:  { icon: Flame,        label: "kti",      tone: "text-orange-500" },
  scheduled: { icon: Radio,        label: "scheduled", tone: "text-emerald-600 dark:text-emerald-400" },
};

const SUBJECT_ICON: Record<RankedAction["subject_kind"], typeof CheckSquare> = {
  task: CheckSquare,
  project: FolderKanban,
  session: CalendarClock,
  campaign: Megaphone,
  workflow_step_run: WorkflowIcon,
  kti: Flame,
};

function toWalkKind(k: RankedAction["subject_kind"]): WalkKind | null {
  if (k === "task" || k === "project" || k === "session") return k;
  if (k === "workflow_step_run") return "workflow_run";
  return null;
}

interface Props {
  actions: RankedAction[];
  meOperatorId: string | null;
  initialLimit?: number;
  expanded: boolean;
}

export function TodayNextActions({ actions, meOperatorId, initialLimit = 8, expanded }: Props) {
  const visible = expanded ? actions.slice(0, initialLimit + 5) : actions.slice(0, initialLimit);

  if (actions.length === 0) {
    return (
      <section className="panel mb-5 overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[color:var(--iris-violet)]" />
            <h2 className="text-sm font-semibold">Next best actions</h2>
          </div>
        </header>
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          Nothing ranked right now. New handoffs, approvals, and overdue work will appear here as they land.
        </div>
      </section>
    );
  }

  return (
    <section className="panel mb-5 overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[color:var(--iris-violet)]" />
          <h2 className="text-sm font-semibold">Next best actions</h2>
          <Badge variant="outline" className="h-5 text-[10px]">{actions.length}</Badge>
        </div>
        <span className="text-[11px] text-muted-foreground">Top {visible.length} of {actions.length}</span>
      </header>
      <ol className="divide-y divide-border">
        {visible.map((a, i) => (
          <ActionRow key={a.key} action={a} index={i + 1} meOperatorId={meOperatorId} />
        ))}
      </ol>
    </section>
  );
}

function ActionRow({ action, index, meOperatorId }: { action: RankedAction; index: number; meOperatorId: string | null }) {
  const meta = SOURCE_META[action.source];
  const SubjectIcon = SUBJECT_ICON[action.subject_kind];
  const SourceIcon = meta.icon;
  const href = hrefForSubject(action.subject_kind, action.subject_id);
  const walkKind = toWalkKind(action.subject_kind);
  const qc = useQueryClient();
  const respondFn = useServerFn(respondToHandoff);

  const respond = useMutation({
    mutationFn: async (act: "accept" | "decline") =>
      respondFn({ data: { handoffId: action.handoff_id!, action: act } }),
    onSuccess: (res) => {
      if (res.ok) toast.success("Done");
      else if (res.reason === "race" || res.reason === "already_handled") toast.message("Already handled");
      else toast.error("Could not respond");
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: ["handoff-inbox"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [snoozing, setSnoozing] = useState(false);
  async function snooze() {
    if (action.subject_kind !== "task") return;
    setSnoozing(true);
    try {
      const notBefore = new Date(Date.now() + 60 * 60_000).toISOString();
      await sb.from("tasks").update({ not_before: notBefore }).eq("id", action.subject_id);
      qc.invalidateQueries({ queryKey: ["today"] });
      toast.success("Snoozed 1 hour");
    } finally {
      setSnoozing(false);
    }
  }

  return (
    <li className="group px-5 py-3 transition hover:bg-iris-soft/40">
      <div className="flex items-start gap-3">
        <div className="flex w-6 shrink-0 flex-col items-center pt-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
          {index}
        </div>
        <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted/40", meta.tone)}>
          <SubjectIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={href.to as never}
              params={href.params as never}
              className="min-w-0 truncate text-sm font-semibold hover:underline"
            >
              {action.title}
            </Link>
            <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[10px]", meta.tone)}>
              <SourceIcon className="h-2.5 w-2.5" />
              {meta.label}
            </span>
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(action.occurred_at), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{action.why}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <Link to={href.to as never} params={href.params as never}>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                Open <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            {action.source === "handoff" && action.handoff_id && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate("decline")}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate("accept")}
                >
                  Accept
                </Button>
              </>
            )}
            {action.source === "overdue" && action.subject_kind === "task" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                disabled={snoozing}
                onClick={snooze}
              >
                Snooze 1h
              </Button>
            )}
            {(action.subject_kind === "task" || action.subject_kind === "project" || action.subject_kind === "campaign" || action.subject_kind === "session") && (
              <HandoffSheet
                subjectKind={action.subject_kind}
                subjectId={action.subject_id}
                subjectLabel={action.title}
                fromOperatorId={meOperatorId}
                trigger={
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                    Hand off
                  </Button>
                }
              />
            )}
            {walkKind && (
              <div className="ml-auto">
                <WalkMenu kind={walkKind} id={action.subject_id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
