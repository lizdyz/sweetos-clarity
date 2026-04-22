import { createFileRoute, redirect } from "@tanstack/react-router";

// Canonical SweetCycle journey visualization for the active relationship.
// For now, redirects to Flightdeck (cross-relationship operator dashboard).
// Replace with the dedicated SweetCycle visualization route when ready.
export const Route = createFileRoute("/_app/sweetcycle")({
  beforeLoad: () => {
    throw redirect({ to: "/flightdeck" });
  },
});
