import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SandboxBoard } from "@/components/sandbox-board";

export const Route = createFileRoute("/_app/sandbox")({
  component: SandboxPage,
});

function SandboxPage() {
  return (
    <div className="px-6 py-6">
      <PageHeader
        icon={<FlaskConical className="h-5 w-5" />}
        title="Idea Sandbox"
        purpose="The triage table between raw input and structured work. Drop ideas, run framework lenses, promote to the right kind of work."
        whatYouCanDo={[
          "Triage Captures, KTI fires, and Inbound signals in one place",
          "Run framework overlays (5Ps, BizzyBot lens, KTI candidate, Domain fit) on any idea",
          "Promote a framed idea into a Task, Project, Spark, Decision input, or Component canon",
        ]}
      />
      <SandboxBoard />
    </div>
  );
}
