import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Compass, Gauge, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DecisionFactoryHealth } from "@/components/start/decision-factory-health";
import { OcdaPosition } from "@/components/start/ocda-position";
import { TwoPathsExplainer } from "@/components/start/two-paths-explainer";
import { SidebarGlossary } from "@/components/start/sidebar-glossary";

export const Route = createFileRoute("/_app/start")({
  component: StartPage,
});

function StartPage() {
  const today = format(new Date(), "EEEE, MMM d");
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<Compass className="h-5 w-5" />}
        title="Where do I start?"
        purpose={`${today} · Orient yourself in your own canon — Decision Factory health, OCDA position, and the two paths your work takes.`}
        whatYouCanDo={[
          "See the four-component machine",
          "Spot where the OCDA loop is hot or stalled",
          "Pick Session path or SweetSync path",
        ]}
      />

      <Link
        to="/start/ship-status"
        className="panel-raised flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-iris/40"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-iris-soft text-[color:var(--iris-violet)]">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Ship status →</div>
            <div className="text-xs text-muted-foreground">
              What's real vs aspirational — live tally of routes, components, canon coverage.
            </div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <DecisionFactoryHealth />
      <OcdaPosition />
      <TwoPathsExplainer />
      <SidebarGlossary />
    </div>
  );
}
