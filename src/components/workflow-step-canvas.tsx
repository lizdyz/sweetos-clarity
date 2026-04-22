import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Plus, GitBranch, ShieldCheck, ArrowDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WorkflowStepSheet, type WorkflowStepRow } from "./workflow-step-sheet";

interface Props {
  workflowId: string;
  className?: string;
}

export function WorkflowStepCanvas({ workflowId, className }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<WorkflowStepRow | null>(null);
  const [creatingAt, setCreatingAt] = useState<number | null>(null);

  const { data: steps = [] } = useQuery({
    queryKey: ["workflow_steps", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_steps" as never)
        .select("*")
        .eq("workflow_id", workflowId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as WorkflowStepRow[];
    },
    enabled: !!workflowId,
  });

  const create = useMutation({
    mutationFn: async (position: number) => {
      const payload = {
        workflow_id: workflowId,
        position,
        name: "New step",
        step_type: "action",
      };
      const { error } = await supabase.from("workflow_steps" as never).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow_steps", workflowId] });
      toast.success("Step added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleAddAt(position: number) {
    setCreatingAt(position);
    create.mutate(position);
  }

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/50 p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Workflow steps</h3>
          <span className="text-xs text-muted-foreground">{steps.length}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => handleAddAt(steps.length)}
        >
          <Plus className="h-3 w-3" /> Add step
        </Button>
      </div>

      {steps.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No steps yet. Define the sequence this workflow runs through — including human gates.
        </p>
      ) : (
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={step.id}>
              <button
                type="button"
                onClick={() => setEditing(step)}
                className="group flex w-full items-start gap-3 rounded-lg border border-border/40 bg-background p-3 text-left transition hover:border-border hover:bg-accent/40"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{step.name}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {step.step_type}
                    </span>
                    {step.requires_human_approval && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Human gate
                        {step.approval_role ? ` · ${step.approval_role}` : ""}
                      </span>
                    )}
                    {step.expected_duration_minutes && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {step.expected_duration_minutes}m
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{step.description}</p>
                  )}
                  {step.tagged_components && step.tagged_components.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Builds {step.tagged_components.length} component
                      {step.tagged_components.length === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </button>
              {idx < steps.length - 1 && (
                <div className="my-1 flex justify-center">
                  <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <WorkflowStepSheet
          step={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["workflow_steps", workflowId] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
