import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/roadmap")({
  component: RoadmapPage,
});

function RoadmapPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<TrendingUp className="h-5 w-5" />}
        title="Roadmap"
        purpose="Forward view across engagements. What's coming, what's scheduled, what's at risk."
        whatYouCanDo={["See the next 4–12 weeks", "Spot scheduling collisions", "Re-sequence at the engagement level"]}
      />
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Wave 4 placeholder
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Forward timeline reading from time_grid + engagement_plans ships in Wave 4.
        </p>
      </div>
    </div>
  );
}
