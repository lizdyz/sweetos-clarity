import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { JTBDList } from "@/components/jtbd-list";

export const Route = createFileRoute("/_app/personas/$id")({
  component: PersonaDetail,
});

function PersonaDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <EntityDetailPage entityKey="personas" />
      <div className="px-6 pb-8">
        <JTBDList personaId={id} />
      </div>
    </div>
  );
}
