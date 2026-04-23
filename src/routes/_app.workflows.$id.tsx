import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EntityDetailPage } from "@/components/entity-workspace";
import { WorkflowStatesPanel } from "@/components/workflow-states-panel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Loader2, ArrowRight, Clock, Puzzle, Target } from "lucide-react";
import { toast } from "sonner";
import { sb as supabase } from "@/lib/sb";
import { activateWorkflow } from "@/utils/workflows.functions";
import { format } from "date-fns";
import { WorkflowStepCanvas } from "@/components/workflow-step-canvas";
import { MeasuresPanel } from "@/components/measures-panel";
import { WorkflowExecutionChip } from "@/components/workflow-execution-chip";
import { WorkflowExecutionTab } from "@/components/workflow-execution-tab";

export const Route = createFileRoute("/_app/workflows/$id")({
  component: WorkflowDetail,
});

interface WorkflowRun {
  id: string;
  status: string;
  progress_pct: number | null;
  created_at: string;
  relationship_id: string | null;
  project_id: string | null;
  notes: string | null;
}

function WorkflowDetail() {
  const { id } = useParams({ from: "/_app/workflows/$id" });
  const [activateOpen, setActivateOpen] = useState(false);

  const { data: runs, refetch: refetchRuns } = useQuery({
    queryKey: ["workflow_runs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("id, status, progress_pct, created_at, relationship_id, project_id, notes")
        .eq("workflow_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkflowRun[];
    },
  });

  const { data: rollup } = useQuery({
    queryKey: ["workflow_rollup", id],
    queryFn: async () => {
      const [stepsRes, compsRes, woRes] = await Promise.all([
        supabase
          .from("workflow_steps" as never)
          .select("id, expected_duration_minutes, deliverables")
          .eq("workflow_id", id),
        supabase
          .from("workflow_step_components" as never)
          .select(
            "component_id, components(id,name), workflow_step_id, workflow_steps!inner(workflow_id)",
          )
          .eq("workflow_steps.workflow_id", id),
        supabase
          .from("workflow_outcomes" as never)
          .select("outcome_id, outcomes(id,description)")
          .eq("workflow_id", id),
      ]);
      const steps = (stepsRes.data ?? []) as Array<{
        expected_duration_minutes: number | null;
        deliverables: string[] | null;
      }>;
      const totalMin = steps.reduce(
        (sum, s) => sum + (s.expected_duration_minutes ?? 0),
        0,
      );
      const allDeliverables = steps.flatMap((s) => s.deliverables ?? []);
      const compRows = (compsRes.data ?? []) as Array<{
        component_id: string;
        components: { id: string; name: string } | null;
      }>;
      const compMap = new Map<string, string>();
      compRows.forEach((c) => {
        if (c.components) compMap.set(c.components.id, c.components.name);
      });
      const woRows = (woRes.data ?? []) as Array<{
        outcome_id: string;
        outcomes: { id: string; description: string | null } | null;
      }>;
      return {
        totalMinutes: totalMin,
        deliverables: allDeliverables,
        components: Array.from(compMap.entries()).map(([cid, name]) => ({
          id: cid,
          name,
        })),
        outcomes: woRows
          .map((w) => w.outcomes)
          .filter((o): o is { id: string; description: string | null } => !!o),
      };
    },
  });

  return (
    <div className="relative">
      <EntityDetailPage entityKey="workflows" />
      <div className="space-y-5 px-6 pb-8">
        <div className="flex justify-end">
          <WorkflowExecutionChip workflowId={id} />
        </div>
        {rollup &&
          (rollup.totalMinutes > 0 ||
            rollup.components.length > 0 ||
            rollup.outcomes.length > 0 ||
            rollup.deliverables.length > 0) && (
            <section className="panel p-5">
              <h2 className="mb-3 text-sm font-semibold">What this workflow produces</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" /> Total time
                  </div>
                  <p className="text-lg font-semibold">
                    {rollup.totalMinutes > 0 ? `~${rollup.totalMinutes} min` : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Summed across all steps
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Puzzle className="h-3 w-3" /> Components advanced
                  </div>
                  {rollup.components.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No links yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {rollup.components.map((c) => (
                        <span
                          key={c.id}
                          className="rounded-full bg-iris-soft px-2 py-0.5 text-[10px]"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Target className="h-3 w-3" /> Outcomes served
                  </div>
                  {rollup.outcomes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No outcome links yet</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {rollup.outcomes.map((o) => (
                        <li key={o.id} className="text-xs text-foreground/90">
                          • {o.description ?? "Outcome"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    📦 Deliverables
                  </div>
                  {rollup.deliverables.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None yet</p>
                  ) : (
                    <p className="text-xs text-foreground/90">
                      {rollup.deliverables.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

        <section className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Activations</h2>
              <p className="text-xs text-muted-foreground">
                Each activation creates a workflow run and stages a kickoff quest in
                the queue.
              </p>
            </div>
            <Button
              onClick={() => setActivateOpen(true)}
              className="bg-iris text-white"
            >
              <Zap className="mr-1.5 h-4 w-4" />
              Activate workflow
            </Button>
          </div>

          {runs && runs.length > 0 ? (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {runs.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-iris-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {r.status}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    {r.notes && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {r.notes}
                      </p>
                    )}
                  </div>
                  <Link
                    to="/workflows/$id/runs/$runId"
                    params={{ id, runId: r.id }}
                    className="inline-flex items-center gap-1 text-xs text-[color:var(--iris-violet)] hover:underline"
                  >
                    Open run <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-xs text-muted-foreground">
              No activations yet. Click <strong>Activate workflow</strong> to stage a
              kickoff quest in the queue.
            </div>
          )}
        </section>

        <WorkflowStepCanvas workflowId={id} />
        <WorkflowStatesPanel workflowId={id} />
        <WorkflowExecutionTab workflowId={id} />
        <MeasuresPanel subjectType="workflow" subjectId={id} />
      </div>

      {activateOpen && (
        <ActivateSheet
          workflowId={id}
          onClose={() => setActivateOpen(false)}
          onDone={() => {
            setActivateOpen(false);
            refetchRuns();
          }}
        />
      )}
    </div>
  );
}

function ActivateSheet({
  workflowId,
  onClose,
  onDone,
}: {
  workflowId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [relationshipId, setRelationshipId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rels } = useQuery({
    queryKey: ["activate-rels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationships")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
  const { data: projects } = useQuery({
    queryKey: ["activate-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  async function submit() {
    setBusy(true);
    try {
      const result = await activateWorkflow({
        data: {
          workflowId,
          relationshipId: relationshipId || undefined,
          projectId: projectId || undefined,
          notes: notes || undefined,
        },
      });
      if (!result.ok) throw new Error(result.error);
      toast.success("Workflow activated. Kickoff quest staged in queue.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Activate workflow</SheetTitle>
          <SheetDescription>
            Creates a workflow run and stages a kickoff quest as a proposal you'll
            approve in the queue.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Relationship (optional)</Label>
            <Select
              value={relationshipId || "__none"}
              onValueChange={(v) => setRelationshipId(v === "__none" ? "" : v)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— No client —</SelectItem>
                {(rels ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Project (optional)</Label>
            <Select
              value={projectId || "__none"}
              onValueChange={(v) => setProjectId(v === "__none" ? "" : v)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— No project —</SelectItem>
                {(projects ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Why are you activating this now?"
              className="rounded-xl"
            />
          </div>
        </div>
        <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-iris text-white">
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Activating…
              </>
            ) : (
              <>
                <Zap className="mr-1.5 h-4 w-4" /> Activate
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
