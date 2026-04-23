// Wave 20: this route was promoted out of Settings into Work as a
// first-class operational surface. Redirect to the new home.

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/open-decisions")({
  beforeLoad: () => {
    throw redirect({ to: "/decisions/open" });
  },
});
