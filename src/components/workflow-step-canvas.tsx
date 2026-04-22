import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import {
  Plus,
  GitBranch,
  ShieldCheck,
  ArrowDown,
  Clock,
  CheckCircle2,
  Package,
  Puzzle,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WorkflowStepSheet, type WorkflowStepRow } from "./workflow-step-sheet";

interface Props {
  workflowId: string;
  className?: string;
}

interface StepComponentLink {
  workflow_step_id: string;
  component_id: string;
  components: { id: string; name: string } | null;
}
interface StepOutcomeLink {
  workflow_step_id: string;
  outcome_id: string;
  outcomes: { id: string; description: string | null } | null;
}

export function WorkflowStepCanvas({ workflowId, className }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<WorkflowStepRow | null>(null);

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

  const stepIds = steps.map((s) => s.id);

  const { data: componentLinks = [] } = useQuery({
    queryKey: ["workflow_step_components", workflowId, stepIds.length],
    queryFn: async () => {
      if (stepIds.length === 0) return [] as StepComponentLink[];
      const { data, error } = await supabase
        .from("workflow_step_components" as never)
        .select("workflow_step_id, component_id, components(id,name)")
        .in("workflow_step_id", stepIds);
      if (error) throw error;
      return (data ?? []) as unknown as StepComponentLink[];
    },
    enabled: stepIds.length > 0,
  });

  const { data: outcomeLinks = [] } = useQuery({
    queryKey: ["workflow_step_outcomes", workflowId, stepIds.length],
    queryFn: async () => {
      if (stepIds.length === 0) return [] as StepOutcomeLink[];
      const { data, error } = await supabase
        .from("workflow_step_outcomes" as never)
        .select("workflow_step_id, outcome_id, outcomes(id,description)")
        .in("workflow_step_id", stepIds);
      if (error) throw error;
      return (data ?? []) as unknown as StepOutcomeLink[];
    },
    enabled: stepIds.length > 0,
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
          onClick={() => create.mutate(steps.length)}
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
          {steps.map((step, idx) => {
            const stepComponents = componentLinks.filter(
              (l) => l.workflow_step_id === step.id,
            );
            const stepOutcomes = outcomeLinks.filter(
              (l) => l.workflow_step_id === step.id,
            );
            return (
              <div key={step.id}>
                <button
                  type="button"
                  onClick={() => setEditing(step)}
                  className="group flex w-full items-start gap-3 rounded-lg border border-border/40 bg-background p-4 text-left transition hover:border-border hover:bg-accent/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{step.name}</span>
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
                      {step.expected_duration_minutes ? (
                        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />~{step.expected_duration_minutes}m
                        </span>
                      ) : null}
                    </div>

                    {step.description && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    )}

                    {step.success_criteria && step.success_criteria.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" /> What good looks like
                        </div>
                        <ul className="space-y-1">
                          {step.success_criteria.map((c, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-foreground/90"
                            >
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-sm border border-border" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {stepComponents.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <Puzzle className="h-3 w-3" /> Builds these components
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {stepComponents.map((c) => (
                            <span
                              key={c.component_id}
                              className="rounded-full bg-iris-soft px-2 py-0.5 text-[10px] text-foreground"
                            >
                              {c.components?.name ?? "Component"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {stepOutcomes.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <Target className="h-3 w-3" /> Serves these outcomes
                        </div>
                        <ul className="space-y-0.5">
                          {stepOutcomes.map((o) => (
                            <li key={o.outcome_id} className="text-xs text-foreground/90">
                              • {o.outcomes?.description ?? "Outcome"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {step.deliverables && step.deliverables.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <Package className="h-3 w-3" /> Deliverables
                        </div>
                        <p className="text-xs text-foreground/90">
                          {step.deliverables.join(" · ")}
                        </p>
                      </div>
                    )}
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <div className="my-1 flex justify-center">
                    <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <WorkflowStepSheet
          step={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["workflow_steps", workflowId] });
            qc.invalidateQueries({ queryKey: ["workflow_step_components", workflowId] });
            qc.invalidateQueries({ queryKey: ["workflow_step_outcomes", workflowId] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
