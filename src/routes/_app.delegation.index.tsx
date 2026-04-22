import { createFileRoute, Link } from "@tanstack/react-router";
import { GitBranch, Workflow as WorkflowIcon } from "lucide-react";
import { EntityListPage } from "@/components/entity-workspace";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LizDependencyGauge } from "@/components/liz-dependency-gauge";

export const Route = createFileRoute("/_app/delegation/")({
  component: DelegationPage,
});

function DelegationPage() {
  return (
    <div className="space-y-2">
      <div className="px-6 pt-6">
        <PageHeader
          icon={<GitBranch className="h-5 w-5" />}
          title="Delegation register"
          purpose="The list of work that should leave your plate. Each row is a responsibility currently owned by you that we want to systematize, train someone on, or hand to an agent. Different from Tasks (which are the doing) — Delegation is planning to hand off."
          whatYouCanDo={[
            "Capture: what is it, who currently does it, who could it go to",
            "Score: how much effort to hand off, what would unlock delegation",
            'Convert to a Workflow draft when "what would make it delegatable" is clear',
          ]}
          actions={
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/workflows">
                <WorkflowIcon className="h-3.5 w-3.5" /> See Workflows
              </Link>
            </Button>
          }
        />
      </div>
      <div className="px-6">
        <LizDependencyGauge />
      </div>
      <EntityListPage entityKey="delegation" />
    </div>
  );
}
