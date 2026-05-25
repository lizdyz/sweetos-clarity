import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/metrics")({
  component: MetricsPage,
});

function MetricsPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<BarChart3 className="h-5 w-5" />}
        title="Metrics"
        purpose="Destination view for Objectives, KRs, KPIs, and CSFs across the system. Aggregated by domain and tenet."
        whatYouCanDo={["Scan measure health system-wide", "Pivot by domain or tenet", "Jump to the source measure"]}
      />
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Wave 4 placeholder
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          measure_health aggregated by domain/tenet ships in Wave 4.
        </p>
      </div>
    </div>
  );
}
