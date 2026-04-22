import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimeControls } from "@/components/time-controls";
import { MeasuresPanel } from "@/components/measures-panel";
import { AuditTrailPanel } from "@/components/audit-trail-panel";
import { Calendar, DollarSign, Users, Layers } from "lucide-react";

interface Props {
  planId: string;
}

interface PlanRow {
  id: string;
  plan_name: string;
  status: string;
  relationship_id: string;
  start_date: string | null;
  end_date: string | null;
  total_revenue_usd: number | null;
  expected_domains: string[];
  machine_roadmap: string | null;
  map_roadmap: string | null;
  notes: string | null;
  created_at: string;
  scheduled_for?: string | null;
  not_before?: string | null;
  recurrence_rule?: string | null;
}

interface ServiceRow {
  id: string;
  service_type: string;
  status: string;
  sessions_purchased: number | null;
  sessions_used: number | null;
  total_value_usd: number | null;
  start_date: string | null;
  end_date: string | null;
  scheduled_for: string | null;
  not_before: string | null;
  target_completion_date: string | null;
  recurrence_rule: string | null;
}

export function EngagementPlanAnatomy({ planId }: Props) {
  const { data: plan } = useQuery({
    queryKey: ["engagement_plan", planId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("engagement_plans")
        .select("*")
        .eq("id", planId)
        .single();
      if (error) throw error;
      return data as PlanRow;
    },
  });

  const { data: relationship } = useQuery({
    enabled: !!plan?.relationship_id,
    queryKey: ["relationship-light", plan?.relationship_id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationships")
        .select("id, organization_name")
        .eq("id", plan!.relationship_id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; organization_name: string } | null;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["engagement_services", "by-plan", planId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("engagement_services")
        .select("*")
        .eq("plan_id", planId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },
  });

  if (!plan) return null;

  const totalSessions = services.reduce((s, x) => s + (x.sessions_purchased ?? 0), 0);
  const usedSessions = services.reduce((s, x) => s + (x.sessions_used ?? 0), 0);

  return (
    <div className="space-y-5 px-6 pb-8">
      {/* Header summary */}
      <Card className="panel-raised p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{plan.plan_name}</h2>
              <Badge variant="secondary">{plan.status}</Badge>
            </div>
            {relationship && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {relationship.organization_name}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {(plan.start_date || plan.end_date) && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {plan.start_date ?? "—"} → {plan.end_date ?? "—"}
              </span>
            )}
            {plan.total_revenue_usd != null && (
              <span className="inline-flex items-center gap-1 font-medium">
                <DollarSign className="h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
                {plan.total_revenue_usd.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Service shape strip */}
      <Card className="panel-raised p-5">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Service shape</h3>
        {services.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            No services attached yet. Services define what this plan delivers (Mirror, Map, Sync, etc.).
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {services.map((s) => (
              <Badge key={s.id} variant="outline" className="gap-1 px-2 py-1 text-xs">
                <Layers className="h-3 w-3" />
                {s.service_type}
                {s.sessions_purchased != null && (
                  <span className="ml-1 text-muted-foreground">
                    ({s.sessions_used ?? 0}/{s.sessions_purchased})
                  </span>
                )}
              </Badge>
            ))}
            {totalSessions > 0 && (
              <span className="ml-2 text-[11px] text-muted-foreground">
                {usedSessions} of {totalSessions} sessions used
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Plan-level timeline */}
      <Card className="panel-raised p-5">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Plan timeline</h3>
        <TimeControls
          table="engagement_plans"
          rowId={planId}
          dueColumn="target_date"
          doneColumn={null}
          createdAt={plan.created_at}
          scheduledFor={plan.scheduled_for ?? plan.start_date}
          notBefore={plan.not_before ?? null}
          dueAt={plan.end_date}
          recurrenceRule={plan.recurrence_rule ?? null}
          showRecurrence={false}
          className=""
          invalidateKeys={[["engagement_plan", planId]]}
        />
      </Card>

      {/* Services with per-row time controls */}
      {services.length > 0 && (
        <Card className="panel-raised p-5">
          <h3 className="mb-3 text-sm font-semibold tracking-tight">Services</h3>
          <div className="space-y-4">
            {services.map((s) => (
              <div key={s.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{s.service_type}</Badge>
                    <span className="text-xs text-muted-foreground">{s.status}</span>
                  </div>
                  {s.total_value_usd != null && (
                    <span className="text-xs font-medium">
                      ${s.total_value_usd.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <TimeControls
                    table="engagement_services"
                    rowId={s.id}
                    dueColumn="target_date"
                    doneColumn={null}
                    scheduledFor={s.scheduled_for ?? s.start_date}
                    notBefore={s.not_before}
                    dueAt={s.target_completion_date ?? s.end_date}
                    recurrenceRule={s.recurrence_rule}
                    className=""
                    invalidateKeys={[["engagement_services", "by-plan", planId]]}
                  />
                </div>
                <div className="mt-3">
                  <MeasuresPanel
                    subjectType="engagement_service"
                    subjectId={s.id}
                    title={`Measures · ${s.service_type}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Roadmap */}
      {(plan.expected_domains?.length || plan.machine_roadmap || plan.map_roadmap) && (
        <Card className="panel-raised p-5">
          <h3 className="mb-3 text-sm font-semibold tracking-tight">Roadmap</h3>
          {plan.expected_domains?.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Target domains
              </div>
              <div className="flex flex-wrap gap-1">
                {plan.expected_domains.map((d) => (
                  <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>
                ))}
              </div>
            </div>
          )}
          {plan.machine_roadmap && (
            <div className="mb-3 text-sm">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Machine roadmap
              </div>
              <p className="text-foreground/80">{plan.machine_roadmap}</p>
            </div>
          )}
          {plan.map_roadmap && (
            <div className="text-sm">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Map roadmap
              </div>
              <p className="text-foreground/80">{plan.map_roadmap}</p>
            </div>
          )}
        </Card>
      )}

      {/* Plan-level measures (rolled up via the relationship) */}
      <MeasuresPanel
        subjectType="relationship"
        subjectId={plan.relationship_id}
        title="Plan KPIs (NPS, retention, revenue)"
      />

      {/* Audit trail */}
      <AuditTrailPanel subjectKind="engagement_plan" subjectId={planId} />
    </div>
  );
}
