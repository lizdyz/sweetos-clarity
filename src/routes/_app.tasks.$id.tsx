import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
export const Route = createFileRoute("/_app/tasks/$id")({
  component: () => <EntityDetailPage entityKey="tasks" />,
});
