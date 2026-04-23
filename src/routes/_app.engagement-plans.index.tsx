import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
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
          purpose="The contract shape for one relationship over a stretch of time (3–12 months) — bundles services purchased, the roadmap of domains/tenets to move, revenue terms, and expected sessions. Each active plan has its own SweetCycle rhythm."
          whatYouCanDo={[
            "Create a plan and attach the services purchased (Mirror, Map, Sync)",
            "Set the term dates and revenue target",
            "Open a plan to see its anatomy + drill into its SweetCycle",
          ]}
          connectsTo={[
            { to: "/relationships", label: "Relationships" },
            { to: "/sweetcycle", label: "SweetCycle" },
            { to: "/sessions", label: "Sessions" },
            { to: "/playbooks", label: "Playbooks" },
          ]}
          nextSteps={["Activate plans", "Track revenue", "Schedule sessions"]}
          actions={
            <Link
              to="/sweetcycle"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-iris-soft/40 hover:text-foreground"
              title="See every active client's SweetCycle on one board"
            >
              <Compass className="h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
              View all SweetCycles →
            </Link>
          }
        />
      </div>
      <EntityListPage entityKey="engagement_plans" />
    </div>
  );
}
