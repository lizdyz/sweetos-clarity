import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
export const Route = createFileRoute("/_app/engagement-plans/$id")({
  component: () => <EntityDetailPage entityKey="engagement_plans" />,
});
