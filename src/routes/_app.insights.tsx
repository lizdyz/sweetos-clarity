import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/insights")({
  component: InsightsPage,
});

function InsightsPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<Lightbulb className="h-5 w-5" />}
        title="Insights"
        purpose="Lessons that change how SweetBOS builds, operates, or improves. Insights trigger improvements."
        whatYouCanDo={["Log a lesson", "Link it to the improvement it triggers", "Review patterns across engagements"]}
      />
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Wave 3 placeholder
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Insights table + improvement-trigger linkage ships in Wave 3.
        </p>
      </div>
    </div>
  );
}
