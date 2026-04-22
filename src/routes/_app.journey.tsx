import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/journey")({
  beforeLoad: () => {
    throw redirect({ to: "/flightdeck" });
  },
});
