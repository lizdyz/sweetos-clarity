import { createFileRoute } from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/risks")({
  component: RisksPage,
});

function RisksPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<Flag className="h-5 w-5" />}
        title="Risks"
        purpose="Threats to quality, trust, delivery, and compliance. Every risk has an owner and a mitigation."
        whatYouCanDo={["Log a new risk against any record", "Assign an owner + mitigation", "Track severity over time"]}
      />
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Wave 3 placeholder
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Risks table (owner, mitigation, severity, polymorphic subject) + RisksPanel mount ships in Wave 3.
        </p>
      </div>
    </div>
  );
}
