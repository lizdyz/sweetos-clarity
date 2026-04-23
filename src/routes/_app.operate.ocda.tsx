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
        purpose="Observe · Choose · Decide · Act — the loop that makes your Decision Factory compound rather than reset. Each lane is a working surface; advance items by clicking their stage chip."
        whatYouCanDo={[
          "Triage observations from Capture, Sparks, KTI fires, and Inbound signals",
          "Click any card's OCDA chip to advance it through stages",
          "Log a formal Decision inline from the Decide lane",
        ]}
        connectsTo={[
          { to: "/decisions", label: "Decisions" },
          { to: "/decisions/open", label: "Open Decisions" },
          { to: "/sandbox", label: "Sandbox" },
          { to: "/sweetscan", label: "SweetScan" },
        ]}
        nextSteps={["Frame observations", "Weigh choices", "Log decisions", "Move work"]}
      />
      <FactoryHealthStrip />
      <OCDACockpit />
    </div>
  );
}
