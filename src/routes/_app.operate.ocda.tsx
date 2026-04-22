import { createFileRoute } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OCDACockpit } from "@/components/ocda-cockpit";

export const Route = createFileRoute("/_app/operate/ocda")({
  component: OCDAPage,
});

function OCDAPage() {
  return (
    <div className="px-6 py-6">
      <PageHeader
        icon={<Brain className="h-5 w-5" />}
        title="OCDA Cockpit"
        purpose="Observe · Choose · Decide · Act. The thinking surface — every signal, option, decision, and action in one stack."
        whatYouCanDo={[
          "See pending observations from Capture, Sparks, and Signal Scanners",
          "Track which options you're weighing",
          "Review logged decisions and what's now in motion",
        ]}
      />
      <OCDACockpit />
    </div>
  );
}
