import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<LayoutGrid className="h-5 w-5" />}
        title="Portfolio"
        purpose="Cross-system health. Derived from source objects. Does not create records."
        whatYouCanDo={["Scan all relationships at a glance", "Spot maturity gaps", "Drill into any tile"]}
      />
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Wave 4 placeholder
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Rollup of relationship_domain_maturity + operator_workload + measure_health ships in Wave 4.
        </p>
      </div>
    </div>
  );
}
