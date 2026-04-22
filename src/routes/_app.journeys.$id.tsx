import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
export const Route = createFileRoute("/_app/journeys/$id")({
  component: () => <EntityDetailPage entityKey="journeys" />,
});
