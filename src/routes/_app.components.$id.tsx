import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { ActiveBuildPanel } from "@/components/active-build-panel";
import { MeasuresPanel } from "@/components/measures-panel";

export const Route = createFileRoute("/_app/components/$id")({
  component: ComponentDetail,
});

function ComponentDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <ActiveBuildPanel componentId={id} />
      <EntityDetailPage entityKey="components" />
      <div className="px-6 pb-8">
        <MeasuresPanel subjectType="component" subjectId={id} />
      </div>
    </div>
  );
}
