import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  Clock,
  ShieldCheck,
  XCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface Step {
  id: string;
  position: number;
  name: string;
  description: string | null;
  step_type: string;
  requires_human_approval: boolean;
  approval_role: string | null;
  expected_duration_minutes: number | null;
  success_criteria: string | null;
}

interface StepRun {
  id: string;
  run_id: string;
  step_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  operator_id: string | null;
  notes: string | null;
  approval_decision: string | null;
  approval_by: string | null;
  approval_at: string | null;
}

interface Run {
  id: string;
  workflow_id: string;
  status: string | null;
  current_step_id: string | null;
  awaiting_approval_from: string | null;
  approval_requested_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; tone: string; icon: typeof Circle }> = {
  pending: { label: "Pending", tone: "text-muted-foreground", icon: Circle },
  in_progress: { label: "In progress", tone: "text-iris", icon: Loader2 },
  awaiting_approval: { label: "Awaiting approval", tone: "text-amber-600 dark:text-amber-400", icon: ShieldCheck },
  approved: { label: "Approved", tone: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  done: { label: "Done", tone: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "text-rose-600 dark:text-rose-400", icon: XCircle },
  skipped: { label: "Skipped", tone: "text-muted-foreground", icon: Circle },
};

interface Props {
  workflowId: string;
  runId: string;
  className?: string;
}

export function WorkflowRunTracker({ workflowId, runId, className }: Props) {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();

  const { data: run } = useQuery({
    queryKey: ["workflow_run", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("id, workflow_id, status, current_step_id, awaiting_approval_from, approval_requested_at, notes, created_at")
        .eq("id", runId)
        .maybeSingle();
      if (error) throw error;
      return data as Run | null;
    },
  });

  const { data: steps = [] } = useQuery({
    queryKey: ["workflow_steps", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_steps" as never)
        .select("*")
        .eq("workflow_id", workflowId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as Step[];
    },
  });

  const { data: stepRuns = [] } = useQuery({
    queryKey: ["workflow_step_runs", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_step_runs" as never)
        .select("*")
        .eq("run_id", runId);
      if (error) throw error;
      return (data ?? []) as unknown as StepRun[];
    },
  });

  const runByStep = useMemo(() => {
    const m = new Map<string, StepRun>();
    stepRuns.forEach((r) => m.set(r.step_id, r));
    return m;
  }, [stepRuns]);

  const advance = useMutation({
    mutationFn: async ({
      stepRun,
      decision,
      notes,
      reject,
    }: {
      stepRun: StepRun;
      decision: string;
      notes: string;
      reject: boolean;
    }) => {
      if (reject) {
        const { error } = await supabase
          .from("workflow_step_runs" as never)
          .update({
            approval_decision: decision,
            notes,
            status: "rejected",
            approval_by: user?.id ?? null,
            approval_at: new Date().toISOString(),
          } as never)
          .eq("id", stepRun.id);
        if (error) throw error;
        return;
      }

      // approve current
      const { error: e1 } = await supabase
        .from("workflow_step_runs" as never)
        .update({
          approval_decision: decision,
          notes: notes || stepRun.notes,
          status: "done",
          approval_by: user?.id ?? null,
          approval_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        } as never)
        .eq("id", stepRun.id);
      if (e1) throw e1;

      // find next step
      const currentIdx = steps.findIndex((s) => s.id === stepRun.step_id);
      const next = currentIdx >= 0 ? steps[currentIdx + 1] : null;

      if (next) {
        // spawn next step run if not already there
        const existing = runByStep.get(next.id);
        if (!existing) {
          const { error: e2 } = await supabase
            .from("workflow_step_runs" as never)
            .insert({
              run_id: runId,
              step_id: next.id,
              status: next.requires_human_approval ? "awaiting_approval" : "pending",
              started_at: new Date().toISOString(),
            } as never);
          if (e2) throw e2;
        }
        const { error: e3 } = await supabase
          .from("workflow_runs")
          .update({
            current_step_id: next.id,
            awaiting_approval_from: next.requires_human_approval ? next.approval_role : null,
            approval_requested_at: next.requires_human_approval ? new Date().toISOString() : null,
          })
          .eq("id", runId);
        if (e3) throw e3;
      } else {
        const { error: e4 } = await supabase
          .from("workflow_runs")
          .update({
            current_step_id: null,
            awaiting_approval_from: null,
            status: "Completed",
          })
          .eq("id", runId);
        if (e4) throw e4;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow_step_runs", runId] });
      qc.invalidateQueries({ queryKey: ["workflow_run", runId] });
      qc.invalidateQueries({ queryKey: ["workflow_runs", workflowId] });
      toast.success("Step updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function canApprove(step: Step) {
    if (!step.requires_human_approval) return false;
    if (!user) return false;
    if (step.approval_role === "any_team_member") return true;
    if (step.approval_role === "admin") return isAdmin;
    if (step.approval_role === "owner") return isAdmin; // treat owner as admin in MVP
    if (step.approval_role === "named_operator") return false; // no operator binding yet
    return false;
  }

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/50 p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Run progress</h3>
          <p className="text-[11px] text-muted-foreground">
            {steps.length} steps · {run?.status ?? "—"}
          </p>
        </div>
      </div>

      {steps.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          This workflow has no steps yet. Define steps on the workflow before running it.
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, idx) => {
            const sr = runByStep.get(step.id);
            const status = sr?.status ?? "pending";
            const meta = STATUS_META[status] ?? STATUS_META.pending;
            const Icon = meta.icon;
            const isCurrent = run?.current_step_id === step.id;
            const isAwaiting = status === "awaiting_approval";
            const dim = !isCurrent && status === "pending";

            return (
              <li
                key={step.id}
                className={cn(
                  "rounded-lg border p-3 transition",
                  isCurrent
                    ? "border-iris/50 bg-iris/5 shadow-sm"
                    : dim
                      ? "border-border/30 bg-background opacity-60"
                      : "border-border/40 bg-background",
                )}
              >
                <div className="flex items-start gap-3">
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
                      <span className={cn("inline-flex items-center gap-1 text-[11px]", meta.tone)}>
                        <Icon className={cn("h-3 w-3", status === "in_progress" && "animate-spin")} />
                        {meta.label}
                      </span>
                    </div>
                    {step.description && (
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    )}
                    {sr?.started_at && (
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        Started {new Date(sr.started_at).toLocaleString()}
                        {sr.completed_at && ` · Completed ${new Date(sr.completed_at).toLocaleString()}`}
                      </p>
                    )}
                    {sr?.notes && (
                      <p className="rounded-md border border-border/40 bg-muted/30 p-2 text-[11px] text-muted-foreground">
                        {sr.notes}
                      </p>
                    )}

                    {isAwaiting && sr && canApprove(step) && (
                      <ApprovalControls
                        onApprove={(notes) =>
                          advance.mutate({ stepRun: sr, decision: "approved", notes, reject: false })
                        }
                        onReject={(notes) =>
                          advance.mutate({ stepRun: sr, decision: "rejected", notes, reject: true })
                        }
                        busy={advance.isPending}
                      />
                    )}

                    {isAwaiting && !canApprove(step) && (
                      <p className="text-[11px] text-muted-foreground">
                        Awaiting <strong>{step.approval_role ?? "approval"}</strong>.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function ApprovalControls({
  onApprove,
  onReject,
  busy,
}: {
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
  busy: boolean;
}) {
  const [notes, setNotes] = useState("");
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border/40 bg-card p-2.5">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Optional approval notes"
        className="text-xs"
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReject(notes)}
          disabled={busy}
          className="h-7 text-xs"
        >
          <XCircle className="mr-1 h-3 w-3" /> Reject
        </Button>
        <Button
          size="sm"
          onClick={() => onApprove(notes)}
          disabled={busy}
          className="h-7 bg-iris text-white text-xs"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
          <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
