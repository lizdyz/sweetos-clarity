import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired in Pass 2A — folded into /capture (proposal review lives there)
export const Route = createFileRoute("/_app/queue")({
  beforeLoad: () => {
    throw redirect({ to: "/capture" });
  },
});
