import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/lenses/$id")({
  component: () => <Navigate to="/settings/lens-studio" replace />,
});
