import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
export const Route = createFileRoute("/_app/workflows/$id")({
  component: () => <EntityDetailPage entityKey="workflows" />,
});
