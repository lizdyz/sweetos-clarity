import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { EntityDetailPage } from "@/components/entity-workspace";
import { EngagementPlanAnatomy } from "@/components/engagement-plan-anatomy";
import { EngagementPlanSweetCycleTab } from "@/components/engagement-plan-sweetcycle-tab";
import { AuditTrailPanel } from "@/components/audit-trail-panel";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

      <div className="px-6 pb-6">
        <Tabs defaultValue="anatomy" className="space-y-4">
          <TabsList>
            <TabsTrigger value="anatomy">Anatomy</TabsTrigger>
            <TabsTrigger value="sweetcycle">SweetCycle</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
          <TabsContent value="anatomy" className="space-y-4">
            <EngagementPlanAnatomy planId={id} />
          </TabsContent>
          <TabsContent value="sweetcycle">
            <EngagementPlanSweetCycleTab planId={id} />
          </TabsContent>
          <TabsContent value="audit">
            <Card className="p-4">
              <AuditTrailPanel subjectKind="engagement_plan" subjectId={id} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
