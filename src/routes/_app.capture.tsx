import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
export const Route = createFileRoute("/_app/capture")({
  component: () => (
    <div className="grid h-full place-items-center px-6 py-16">
      <div className="panel-raised max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold">Universal Capture</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Type, paste, or drop messy reality here. The system parses intent, matches existing
          records, and stages reviewable proposals before any write.
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-wider text-[color:var(--iris-violet)]">
          Coming in Phase 2
        </p>
        <div className="mt-5">
          <Link to="/today" className="text-sm font-medium text-[color:var(--iris-violet)] hover:underline">
            ← Back to Today
          </Link>
        </div>
      </div>
    </div>
  ),
});
