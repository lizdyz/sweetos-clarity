import { createFileRoute } from "@tanstack/react-router";
import { EntityListPage, EntityDetailPage } from "@/components/entity-workspace";

export const Route = createFileRoute("/_app/relationships/")({ component: () => <EntityListPage entityKey="relationships" /> });
export { EntityDetailPage };
