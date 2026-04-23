import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Compass } from "lucide-react";
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

      <DecisionFactoryHealth />
      <OcdaPosition />
      <TwoPathsExplainer />
      <SidebarGlossary />
    </div>
  );
}
