import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { EngagementPlanAnatomy } from "@/components/engagement-plan-anatomy";

export const Route = createFileRoute("/_app/engagement-plans/$id")({
  component: PlanDetail,
});

function PlanDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <EntityDetailPage entityKey="engagement_plans" />
      <EngagementPlanAnatomy planId={id} />
    </div>
  );
}
