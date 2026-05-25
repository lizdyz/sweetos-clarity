import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<MessageSquare className="h-5 w-5" />}
        title="Messages"
        purpose="Internal and client comms tied to records. Every thread links back to the work it's about."
        whatYouCanDo={["Start a thread on any record", "Separate internal vs client comms", "Search by subject"]}
      />
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Wave 3 placeholder
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Messages threads (internal vs client) tied to polymorphic subjects ship in Wave 3.
        </p>
      </div>
    </div>
  );
}
