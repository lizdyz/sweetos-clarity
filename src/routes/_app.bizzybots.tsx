import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/bizzybots")({
  component: () => <Navigate to="/settings/lens-studio" replace />,
});
