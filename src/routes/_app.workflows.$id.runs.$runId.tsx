import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { WorkflowRunTracker } from "@/components/workflow-run-tracker";
import { MeasuresPanel } from "@/components/measures-panel";

export const Route = createFileRoute("/_app/workflows/$id/runs/$runId")({
  component: RunDetail,
});

function RunDetail() {
  const { id, runId } = useParams({ from: "/_app/workflows/$id/runs/$runId" });

  const { data: workflow } = useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
  });

  const { data: run } = useQuery({
    queryKey: ["workflow_run_meta", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("id, status, created_at, notes, relationship_id, project_id")
        .eq("id", runId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-6">
      <Link
        to="/workflows/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to workflow
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workflow?.name ?? "Workflow"} · run
          </h1>
          {run && (
            <p className="mt-1 text-xs text-muted-foreground">
              {run.status ?? "—"} · started {format(new Date(run.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
      </header>

      {run?.notes && (
        <p className="rounded-lg border border-border/40 bg-card/50 p-3 text-xs text-muted-foreground">
          {run.notes}
        </p>
      )}

      <WorkflowRunTracker workflowId={id} runId={runId} />

      <MeasuresPanel subjectType="workflow" subjectId={id} title="Workflow measures" />
    </div>
  );
}
