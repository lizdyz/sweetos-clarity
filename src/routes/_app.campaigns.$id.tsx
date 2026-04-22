import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
export const Route = createFileRoute("/_app/campaigns/$id")({
  component: () => <EntityDetailPage entityKey="campaigns" />,
});
