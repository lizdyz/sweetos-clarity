import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<Bell className="h-5 w-5" />}
        title="Notifications"
        purpose="Alerts, pings, mentions, and review requests. Each links to the source object so you can act in one click."
        whatYouCanDo={["Read incoming alerts", "Jump to the originating record", "Mark as read"]}
      />
      <EmptyWave wave={3} note="Notifications inbox table + bell badge ship in Wave 3." />
    </div>
  );
}

function EmptyWave({ wave, note }: { wave: number; note: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
      <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Wave {wave} placeholder
      </div>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
