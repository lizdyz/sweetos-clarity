import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (!context.auth || context.auth.loading) return;
    if (!context.auth.session) throw redirect({ to: "/login" });
    throw redirect({ to: "/today" });
  },
  component: () => null,
});
