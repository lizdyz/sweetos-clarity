import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired in Pass 2A — folded into /flightdeck (cross-relationship cockpit)
export const Route = createFileRoute("/_app/pipeline")({
  beforeLoad: () => {
    throw redirect({ to: "/flightdeck" });
  },
});
