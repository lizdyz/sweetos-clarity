import { createFileRoute } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OCDACockpit } from "@/components/ocda-cockpit";
import { FactoryHealthStrip } from "@/components/factory-health-strip";

export const Route = createFileRoute("/_app/operate/ocda")({
  component: OCDAPage,
});

function OCDAPage() {
  return (
    <div className="px-6 py-6">
      <PageHeader
        icon={<Brain className="h-5 w-5" />}
        title="OCDA — your Decision Factory"
        purpose="Observe · Choose · Decide · Act — the loop that makes your Decision Factory compound rather than reset."
        whatYouCanDo={[
          "See the four canonical Factory components and where each lives",
          "Triage observations from Capture, Sparks, and Signal Scanners",
          "Track which options you're weighing, then log decisions with rationale",
        ]}
      />
      <FactoryHealthStrip />
      <OCDACockpit />
    </div>
  );
}
