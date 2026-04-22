import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";

export interface InboundSignal {
  id: string;
  source_kind: string;
  source_url: string | null;
  summary: string | null;
  classified_kind: string | null;
  classified_subject_type: string | null;
  classified_subject_id: string | null;
  confidence: number | null;
  status: string;
  created_at: string;
}

/**
 * Inbound signal card with quick-route actions.
 * See `mem://design/sweetscan-as-eyes-and-ears.md`.
 */
export function InboundSignalCard({ signal }: { signal: InboundSignal }) {
  const qc = useQueryClient();

  const dismiss = useMutation({
    mutationFn: async () => {
      const { error } = await sb
        .from("inbound_signals")
        .update({ status: "dismissed" })
        .eq("id", signal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signal dismissed");
      qc.invalidateQueries({ queryKey: ["sweetscan", "inbound"] });
      qc.invalidateQueries({ queryKey: ["world-watch", "inbound"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertToTask = useMutation({
    mutationFn: async () => {
      const { data: userResp } = await sb.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) throw new Error("Not signed in");

      const { error } = await sb.from("tasks").insert({
        name: `Review signal: ${signal.summary?.slice(0, 80) ?? signal.source_url ?? "inbound signal"}`,
        description: [signal.summary, signal.source_url].filter(Boolean).join("\n\n"),
        status: "To Do",
        priority: "Medium",
        spawned_by_kind: "capture",
        spawned_by_id: signal.id,
        relationship_id:
          signal.classified_subject_type === "relationship"
            ? signal.classified_subject_id
            : null,
        created_by: uid,
      });
      if (error) throw error;

      await sb
        .from("inbound_signals")
        .update({ status: "routed", routed_to_kind: "task" })
        .eq("id", signal.id);
    },
    onSuccess: () => {
      toast.success("Created Task from signal");
      qc.invalidateQueries({ queryKey: ["sweetscan", "inbound"] });
      qc.invalidateQueries({ queryKey: ["tasks-index"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/40 bg-card/40 p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-muted px-1.5 py-0 text-[9px] uppercase tracking-wider text-muted-foreground">
          {signal.source_kind}
        </span>
        {signal.classified_kind && (
          <span className="rounded-full bg-iris-soft px-1.5 py-0 text-[9px]">
            {signal.classified_kind}
          </span>
        )}
        {typeof signal.confidence === "number" && (
          <span className="text-[10px] text-muted-foreground">
            {(signal.confidence * 100).toFixed(0)}%
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
        </span>
      </div>
      <p className="line-clamp-3 text-foreground">{signal.summary ?? "(no summary)"}</p>
      {signal.source_url && (
        <a
          href={signal.source_url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-[10px] text-[color:var(--iris-violet)] hover:underline"
        >
          {signal.source_url}
        </a>
      )}
      {signal.classified_subject_type === "relationship" && signal.classified_subject_id && (
        <Link
          to="/relationships/$id"
          params={{ id: signal.classified_subject_id }}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          → Routed to relationship
        </Link>
      )}
      {signal.status === "pending" && (
        <div className="mt-1 flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() => convertToTask.mutate()}
            disabled={convertToTask.isPending}
          >
            <ListChecks className="h-3 w-3" /> Make Task
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
            onClick={() => dismiss.mutate()}
            disabled={dismiss.isPending}
          >
            <X className="h-3 w-3" /> Dismiss
          </Button>
        </div>
      )}
      {signal.status === "routed" && (
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> Routed
        </div>
      )}
    </div>
  );
}
