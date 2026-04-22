import { createFileRoute } from "@tanstack/react-router";
import { EntityListPage } from "@/components/entity-workspace";
export const Route = createFileRoute("/_app/workflows/")({
  component: () => <EntityListPage entityKey="workflows" />,
});
