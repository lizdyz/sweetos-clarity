import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { MeasuresPanel } from "@/components/measures-panel";

export const Route = createFileRoute("/_app/missions/$id")({
  component: MissionDetail,
});

function MissionDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <EntityDetailPage entityKey="missions" />
      <div className="px-6 pb-8">
        <MeasuresPanel subjectType="mission" subjectId={id} />
      </div>
    </div>
  );
}
