import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { ActiveBuildPanel } from "@/components/active-build-panel";

export const Route = createFileRoute("/_app/components/$id")({
  component: ComponentDetail,
});

function ComponentDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <ActiveBuildPanel componentId={id} />
      <EntityDetailPage entityKey="components" />
    </div>
  );
}
