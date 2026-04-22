import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { JTBDList } from "@/components/jtbd-list";

export const Route = createFileRoute("/_app/library/jtbd")({
  component: JTBDIndex,
});

function JTBDIndex() {
  return (
    <div className="space-y-5 p-6">
      <PageHeader
        icon={<Target className="h-5 w-5" />}
        title="Jobs-to-be-done"
        purpose="What your customers are hiring you to accomplish — the situation, the motivation, and the outcome they want. Surfaced wherever it matters: on personas, on components, in OCDA's Observe column."
        whatYouCanDo={[
          'Phrase as: "When [situation], I want to [motivation], so I can [outcome]"',
          "Score pain severity 1–5 to prioritize",
          "Link to the components that address it and outcomes that measure it",
        ]}
      />
      <JTBDList />
    </div>
  );
}
