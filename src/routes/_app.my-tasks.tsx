import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired in Pass 2A — folded into /today
export const Route = createFileRoute("/_app/my-tasks")({
  beforeLoad: () => {
    throw redirect({ to: "/today" });
  },
});
