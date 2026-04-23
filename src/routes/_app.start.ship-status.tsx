import { createFileRoute } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ShipStatusBoard } from "@/components/start/ship-status-board";

export const Route = createFileRoute("/_app/start/ship-status")({
  component: ShipStatusPage,
});

function ShipStatusPage() {
  return (
    <div className="px-6 py-5 space-y-5">
      <PageHeader
        icon={<Gauge className="h-5 w-5" />}
        title="Ship status"
        purpose="What's real, what's aspirational. Live tally of routes, components, and canon coverage so the gap between IA and shipped surfaces is honest."
        whatYouCanDo={[
          "See route + component counts from the live tree",
          "Check entity_canon coverage (purpose · inputs · outputs)",
          "Spot which Wave-9 mounts are pending vs shipped",
        ]}
      />
      <ShipStatusBoard />
    </div>
  );
}
