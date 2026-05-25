import { createFileRoute } from "@tanstack/react-router";
import { FileSearch } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/evidence")({
  component: EvidencePage,
});

function EvidencePage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<FileSearch className="h-5 w-5" />}
        title="Evidence"
        purpose="Proof, source, and rationale. Every record supports at least one other object. Confidence is rated."
        whatYouCanDo={["Attach evidence to any record", "Rate confidence 1–5", "Trace claims back to source"]}
      />
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Wave 3 placeholder
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Evidence library + EvidencePanel mount ships in Wave 3.
        </p>
      </div>
    </div>
  );
}
