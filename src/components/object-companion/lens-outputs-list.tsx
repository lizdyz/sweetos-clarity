import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { sb } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type LensOutput,
  type ObjectKind,
  OUTPUT_KIND_LABELS,
} from "@/lib/lens-types";

interface Props {
  sourceKind: ObjectKind;
  sourceId: string;
  /** Optionally scope to a single lens (used inside LensRunner). */
  lensId?: string;
}

const KIND_TONE: Record<string, string> = {
  observation: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  risk: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  opportunity: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  action: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  task: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  decision: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  choice: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function LensOutputsList({ sourceKind, sourceId, lensId }: Props) {
  const qc = useQueryClient();

  const { data: outputs = [], isLoading } = useQuery<LensOutput[]>({
    queryKey: ["lens_outputs", sourceKind, sourceId, lensId ?? "all"],
    queryFn: async () => {
      let q = sb
        .from("lens_outputs")
        .select("*")
        .eq("source_kind", sourceKind)
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false });
      if (lensId) q = q.eq("lens_id", lensId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const promoteToTask = useMutation({
    mutationFn: async (output: LensOutput) => {
      const { data: u } = await sb.auth.getUser();
      const { data: t, error } = await sb
        .from("tasks")
        .insert({
          name: output.title,
          description: output.body,
          status: "To Do",
          priority: output.kind === "risk" ? "High" : "Medium",
          spawned_by_kind: "lens_output",
          spawned_by_id: output.id,
          created_by: u.user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      await sb
        .from("lens_outputs")
        .update({ status: "promoted", target_kind: "task", target_id: t.id })
        .eq("id", output.id);
      return t.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens_outputs", sourceKind, sourceId] });
      toast.success("Promoted to Task");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const promoteToDecision = useMutation({
    mutationFn: async (output: LensOutput) => {
      const { data: u } = await sb.auth.getUser();
      const { data: d, error } = await sb
        .from("decisions")
        .insert({
          decision: output.title,
          context: output.body,
          status: "Open",
          raised_from_kind: "lens_output",
          raised_from_id: output.id,
          created_by: u.user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      await sb
        .from("lens_outputs")
        .update({ status: "promoted", target_kind: "decision", target_id: d.id })
        .eq("id", output.id);
      return d.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens_outputs", sourceKind, sourceId] });
      toast.success("Promoted to Decision");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("lens_outputs")
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens_outputs", sourceKind, sourceId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading outputs…
      </div>
    );
  }

  if (outputs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        <Sparkles className="mx-auto mb-1 h-3.5 w-3.5 opacity-50" />
        No structured outputs yet. Run a lens to generate observations, risks, and actions.
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {outputs.map((o) => {
        const tone = KIND_TONE[o.kind] ?? "bg-muted text-foreground";
        const isPromoted = o.status === "promoted";
        const isDismissed = o.status === "dismissed";
        return (
          <li
            key={o.id}
            className={`rounded-lg border bg-card p-2.5 ${
              isDismissed ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              <Badge variant="outline" className={`${tone} border-0 text-[10px] uppercase`}>
                {OUTPUT_KIND_LABELS[o.kind]}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight">{o.title}</div>
                {o.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{o.body}</p>
                )}
              </div>
            </div>
            {!isPromoted && !isDismissed && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => promoteToTask.mutate(o)}
                  disabled={promoteToTask.isPending}
                >
                  <ArrowRight className="mr-1 h-2.5 w-2.5" /> Task
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => promoteToDecision.mutate(o)}
                  disabled={promoteToDecision.isPending}
                >
                  <ArrowRight className="mr-1 h-2.5 w-2.5" /> Decision
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] text-muted-foreground"
                  onClick={() => dismiss.mutate(o.id)}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            )}
            {isPromoted && (
              <div className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                ✓ Promoted to {o.target_kind}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
