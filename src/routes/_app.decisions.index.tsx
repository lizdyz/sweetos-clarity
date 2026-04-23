import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { FileText, Brain } from "lucide-react";
import { EntityListPage } from "@/components/entity-workspace";
import { PageHeader } from "@/components/page-header";
import { UniversalFilterBar } from "@/components/universal-filter-bar";
import { universalFilterSchema } from "@/lib/use-universal-filters";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/decisions/")({
  validateSearch: zodValidator(universalFilterSchema),
  component: DecisionsPage,
});

function DecisionsPage() {
  return (
    <div className="space-y-2">
      <div className="space-y-3 px-6 pt-6">
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title="Decisions"
          purpose="A choice you made and why. Decisions are the Decide stage of OCDA — they capture what was chosen, the context, the implications, and what they supersede. Different from Delegation (which is planning to hand off work)."
          whatYouCanDo={[
            'Log "On {date} we decided X because Y"',
            "Link to the project, the supersedes prior decision, and tag domains",
            "Open the OCDA Cockpit to see this in the live decide pipeline",
          ]}
          actions={
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/operate/ocda">
                <Brain className="h-3.5 w-3.5" /> Open OCDA Cockpit
              </Link>
            </Button>
          }
        />
        <UniversalFilterBar
          stateOptions={["proposed", "decided", "superseded", "rolled_back"]}
        />
      </div>
      <EntityListPage entityKey="decisions" />
    </div>
  );
}
