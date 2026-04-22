import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { MeasuresPanel } from "@/components/measures-panel";

export const Route = createFileRoute("/_app/campaigns/$id")({
  component: CampaignDetail,
});

function CampaignDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <EntityDetailPage entityKey="campaigns" />
      <div className="px-6 pb-8">
        <MeasuresPanel subjectType="campaign" subjectId={id} />
      </div>
    </div>
  );
}
