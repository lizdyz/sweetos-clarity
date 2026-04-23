import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SandboxBoard } from "@/components/sandbox-board";
import { UniversalDropZone } from "@/components/universal-drop-zone";
import { UniversalFilterBar } from "@/components/universal-filter-bar";
import { universalFilterSchema } from "@/lib/use-universal-filters";

export const Route = createFileRoute("/_app/sandbox")({
  validateSearch: zodValidator(universalFilterSchema),
  component: SandboxPage,
});

function SandboxPage() {
  return (
    <div className="space-y-4 px-6 py-6">
      <PageHeader
        icon={<FlaskConical className="h-5 w-5" />}
        title="Idea Sandbox"
        purpose="The triage table between raw input and structured work. Drop ideas, run framework lenses, promote to the right kind of work."
        whatYouCanDo={[
          "Drop a file, link, paragraph, or existing card into the zone below",
          "Run framework overlays (5Ps, BizzyBot lens, KTI candidate, Domain fit) on any idea",
          "Promote a framed idea into a Task, Project, Spark, Decision input, or Component canon",
        ]}
      />
      <UniversalDropZone />
      <UniversalFilterBar
        stateOptions={["raw", "framed", "routed", "archived"]}
      />
      <SandboxBoard />
    </div>
  );
}
