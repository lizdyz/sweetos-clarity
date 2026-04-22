import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
export const Route = createFileRoute("/_app/domain-assessments/$id")({
  component: () => <EntityDetailPage entityKey="domain-assessments" />,
});
