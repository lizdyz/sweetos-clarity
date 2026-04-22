import { createFileRoute } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { WorkflowStatesPanel } from "@/components/workflow-states-panel";

export const Route = createFileRoute("/_app/workflows/$id")({
  component: WorkflowDetail,
});

function WorkflowDetail() {
  const { id } = useParams({ from: "/_app/workflows/$id" });
  return (
    <div className="relative">
      <EntityDetailPage entityKey="workflows" />
      <div className="px-6 pb-6">
        <WorkflowStatesPanel workflowId={id} />
      </div>
    </div>
  );
}
