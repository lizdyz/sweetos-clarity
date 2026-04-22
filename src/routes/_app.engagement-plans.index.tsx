import { createFileRoute } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { EntityListPage } from "@/components/entity-workspace";

export const Route = createFileRoute("/_app/engagement-plans/")({
  component: EngagementPlansPage,
});

function EngagementPlansPage() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 px-6 pt-6">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris/10 text-[color:var(--iris-violet)]">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Engagement Plans</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A multi-month plan for one relationship. It bundles the services they bought
            (e.g. <em>1 Mirror + 3 Maps + Sync</em>), what we expect to cover (domains/roadmap),
            and revenue. Each plan rolls up into the SweetCycle and Flightdeck.
          </p>
        </div>
      </div>
      <EntityListPage entityKey="engagement_plans" />
    </div>
  );
}
