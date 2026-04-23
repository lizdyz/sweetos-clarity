import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send, ChevronDown, ChevronRight, Compass, ScrollText, Maximize2, Minimize2 } from "lucide-react";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { EngagementPlanAnatomy } from "@/components/engagement-plan-anatomy";
import { EngagementPlanSweetCycleTab } from "@/components/engagement-plan-sweetcycle-tab";
import { AuditTrailPanel } from "@/components/audit-trail-panel";
import { ObjectCompanion, SweetLensButton } from "@/components/object-companion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/engagement-plans/$id")({
  component: PlanDetail,
});

function PlanDetail() {
  const { id } = Route.useParams();
  const [sweetcycleOpen, setSweetcycleOpen] = useState(true);
  const [sweetcycleExpanded, setSweetcycleExpanded] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [lensOpen, setLensOpen] = useState(false);
  const { data: plan } = useQuery({
    queryKey: ["engagement_plans", "lens-meta", id],
    queryFn: async () => {
      const { data } = await supabase.from("engagement_plans").select("plan_name").eq("id", id).maybeSingle();
      return data as { plan_name: string | null } | null;
    },
  });

  return (
    <div className={lensOpen ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
      <div className="min-w-0 space-y-5">
        <div className="flex items-center justify-end gap-2 px-6 pt-4">
          <SweetLensButton active={lensOpen} onClick={() => setLensOpen((o) => !o)} />
        </div>
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

      <div className="space-y-4 px-6 pb-6">
        <EngagementPlanAnatomy planId={id} />

        {/* SweetCycle peek — collapsible, expanded by default */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setSweetcycleOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-iris-soft/20"
          >
            <div className="flex items-center gap-2">
              {sweetcycleOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Compass className="h-4 w-4 text-[color:var(--iris-violet)]" />
              <span className="text-sm font-semibold tracking-tight">SweetCycle rhythm</span>
              <span className="text-[11px] text-muted-foreground">
                {sweetcycleExpanded ? "full board" : "5-phase peek"}
              </span>
            </div>
            {sweetcycleOpen && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 gap-1 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setSweetcycleExpanded((v) => !v);
                }}
              >
                {sweetcycleExpanded ? (
                  <>
                    <Minimize2 className="h-3 w-3" /> Collapse to peek
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3 w-3" /> Expand to board
                  </>
                )}
              </Button>
            )}
          </button>
          {sweetcycleOpen && (
            <div className={cn("border-t border-border/40 p-4")}>
              <EngagementPlanSweetCycleTab
                planId={id}
                mode={sweetcycleExpanded ? "full" : "compact"}
              />
            </div>
          )}
        </Card>

        {/* Audit trail — collapsible, collapsed by default */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setAuditOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-iris-soft/20"
          >
            {auditOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold tracking-tight">Audit trail</span>
            <span className="text-[11px] text-muted-foreground">reference</span>
          </button>
          {auditOpen && (
            <div className="border-t border-border/40 p-4">
              <AuditTrailPanel subjectKind="engagement_plan" subjectId={id} />
            </div>
          )}
        </Card>
      </div>
      {lensOpen && (
        <div className="px-6 pt-4 lg:pr-6">
          <ObjectCompanion
            objectKind="engagement_plan"
            objectId={id}
            objectTitle={plan?.plan_name ?? "Engagement Plan"}
            className="self-start lg:sticky lg:top-4"
          />
        </div>
      )}
    </div>
  );
}
