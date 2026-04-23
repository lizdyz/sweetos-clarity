import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bot, User, Workflow as WorkflowIcon, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { respondToHandoff } from "@/lib/handoffs";
import type { HandoffStatus, HandoffSubjectKind, HandoffReason } from "@/lib/handoffs";

export type HandoffRowData = {
  id: string;
  from_operator_id: string | null;
  to_operator_id: string;
  subject_kind: HandoffSubjectKind;
  subject_id: string;
  subject_label: string | null;
  reason: HandoffReason;
  status: HandoffStatus;
  note: string | null;
  created_at: string;
  responded_at: string | null;
  fromName?: string | null;
  fromKind?: "human" | "agent" | "workflow" | null;
  toName?: string | null;
  toKind?: "human" | "agent" | "workflow" | null;
};

const REASON_LABEL: Record<HandoffReason, string> = {
  ready_for_review: "Ready for review",
  blocked: "Blocked",
  escalation: "Escalation",
  fyi: "FYI",
  reassign: "Reassign",
};

const STATUS_TONE: Record<HandoffStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  declined: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  cancelled: "bg-muted text-muted-foreground",
  auto_completed: "bg-iris/10 text-[color:var(--iris-violet)]",
};

function KindIcon({ kind }: { kind?: "human" | "agent" | "workflow" | null }) {
  if (kind === "agent") return <Bot className="h-3 w-3" />;
  if (kind === "workflow") return <WorkflowIcon className="h-3 w-3" />;
  return <User className="h-3 w-3" />;
}

function subjectHref(kind: HandoffSubjectKind, id: string): { to: string; params: Record<string, string> } {
  if (kind === "task") return { to: "/tasks/$id", params: { id } };
  if (kind === "project") return { to: "/projects/$id", params: { id } };
  if (kind === "campaign") return { to: "/campaigns/$id", params: { id } };
  if (kind === "session") return { to: "/sessions/$id", params: { id } };
  return { to: "/tasks/$id", params: { id } };
}

export function HandoffRow({ row, direction }: { row: HandoffRowData; direction: "inbound" | "sent" }) {
  const qc = useQueryClient();
  const respondFn = useServerFn(respondToHandoff);

  const respond = useMutation({
    mutationFn: async (action: "accept" | "decline" | "cancel") =>
      respondFn({ data: { handoffId: row.id, action } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Done");
      } else if (res.reason === "race" || res.reason === "already_handled") {
        toast.message("Already handled by someone else");
      } else {
        toast.error("Could not respond");
      }
      qc.invalidateQueries({ queryKey: ["handoff-inbox"] });
      qc.invalidateQueries({ queryKey: ["operator-workload"] });
      qc.invalidateQueries({ queryKey: ["operator-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const href = subjectHref(row.subject_kind, row.subject_id);
  const ago = relTime(row.created_at);

  return (
    <li className="rounded-lg border border-border/40 bg-background p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px]">
          <KindIcon kind={row.fromKind} />
          {row.fromName ?? "—"}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px]">
          <KindIcon kind={row.toKind} />
          {row.toName ?? "—"}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">{ago}</span>
      </div>

      {row.note && (
        <div className="mt-2 text-xs italic text-muted-foreground">"{row.note}"</div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] capitalize text-muted-foreground">{row.subject_kind.replace("_", " ")}:</span>
        <Link
          to={href.to as never}
          params={href.params as never}
          className="min-w-0 flex-1 truncate font-medium hover:underline"
        >
          {row.subject_label ?? row.subject_id.slice(0, 8)}
        </Link>
        <Badge variant="outline" className="h-5 shrink-0 text-[10px]">{REASON_LABEL[row.reason]}</Badge>
        <Badge className={cn("h-5 shrink-0 text-[10px]", STATUS_TONE[row.status])}>{row.status.replace("_", " ")}</Badge>
      </div>

      {row.status === "pending" && direction === "inbound" && (
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => respond.mutate("decline")} disabled={respond.isPending}>
            Decline
          </Button>
          <Button size="sm" onClick={() => respond.mutate("accept")} disabled={respond.isPending}>
            Accept
          </Button>
        </div>
      )}
      {row.status === "pending" && direction === "sent" && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => respond.mutate("cancel")} disabled={respond.isPending}>
            Cancel handoff
          </Button>
        </div>
      )}
    </li>
  );
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
