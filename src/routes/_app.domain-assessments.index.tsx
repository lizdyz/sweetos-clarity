import { createFileRoute } from "@tanstack/react-router";
import { EntityListPage } from "@/components/entity-workspace";
export const Route = createFileRoute("/_app/domain-assessments/")({
  component: () => <EntityListPage entityKey="domain-assessments" />,
});
