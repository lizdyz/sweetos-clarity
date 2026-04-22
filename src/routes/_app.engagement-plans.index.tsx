import { createFileRoute } from "@tanstack/react-router";
import { EntityListPage } from "@/components/entity-workspace";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/engagement-plans/")({
  component: EngagementPlansPage,
});

function EngagementPlansPage() {
  return (
    <div className="space-y-2">
      <div className="px-6 pt-6">
        <PageHeader
          title="Engagement Plans"
          purpose="The contract shape for one relationship over a stretch of time (3–12 months) — bundles services purchased, the roadmap of domains/tenets to move, revenue terms, and expected sessions."
          whatYouCanDo={[
            "Create a plan and attach the services purchased (Mirror, Map, Sync)",
            "Set the term dates and revenue target",
            "Open a plan to see its full anatomy: services, roadmap, sessions, measures",
          ]}
        />
      </div>
      <EntityListPage entityKey="engagement_plans" />
    </div>
  );
}
