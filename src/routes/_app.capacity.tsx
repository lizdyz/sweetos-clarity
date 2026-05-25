import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/capacity")({
  component: CapacityPage,
});

function CapacityPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<Activity className="h-5 w-5" />}
        title="Capacity"
        purpose="Operator load forecasting. Who is over, who is free, what's coming."
        whatYouCanDo={["See 4-week load per operator", "Spot overload before it hits", "Rebalance assignments"]}
      />
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Wave 4 placeholder
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Operator load forecast reading from operator_workload ships in Wave 4.
        </p>
      </div>
    </div>
  );
}
