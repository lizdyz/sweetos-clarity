import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { EntityDetailPage } from "@/components/entity-workspace";
import { EngagementPlanAnatomy } from "@/components/engagement-plan-anatomy";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/engagement-plans/$id")({
  component: PlanDetail,
});

function PlanDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <div className="px-6 pt-4">
        <Card className="flex items-start gap-3 border-iris/20 bg-iris-soft/40 p-3 text-xs">
          <Send className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--iris-violet)]" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Engagement Plan</span> = the contract for one
            relationship over a stretch of time. Bundles services purchased, the roadmap of domains/tenets to
            move, revenue terms, and expected sessions. Sessions consume services and appear in SweetCycle.
          </p>
        </Card>
      </div>
      <EntityDetailPage entityKey="engagement_plans" />
      <EngagementPlanAnatomy planId={id} />
    </div>
  );
}
