import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { Chip } from "@/components/chips";
import { Plus, ExternalLink } from "lucide-react";
import { SweetCycleBoard, type SweetSession } from "@/components/sweetcycle-board";

export const Route = createFileRoute("/_app/relationships/$id")({
  component: RelationshipDetail,
});

function RelationshipDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <RelationshipPanels relationshipId={id} />
      <EntityDetailPage entityKey="relationships" />
    </div>
  );
}

function RelationshipPanels({ relationshipId }: { relationshipId: string }) {
  const { data: rel } = useQuery({
    queryKey: ["relationships", "panels", relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationships")
        .select(
          "id, name, awareness_tier, temperature, drift_risk, proposal_document_id, proposal_sent_at, proposal_expires_at, proposal_version, primary_service, service_status, service_start_date, service_end_date",
        )
        .eq("id", relationshipId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: maturity = [] } = useQuery({
    queryKey: ["relationship_domain_maturity", relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationship_domain_maturity")
        .select("domain_slug, current_level, last_assessed_at")
        .eq("relationship_id", relationshipId);
      if (error) throw error;
      return (data ?? []) as Array<{
        domain_slug: string;
        current_level: string | null;
        last_assessed_at: string | null;
      }>;
    },
  });

  const { data: domains = [] } = useQuery({
    queryKey: ["domains", "all-enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domains")
        .select("slug, name, sort_order")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ slug: string; name: string; sort_order: number }>;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["engagement_plans", "by-rel", relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_plans")
        .select("id, plan_name, status, start_date, end_date, total_revenue_usd")
        .eq("relationship_id", relationshipId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: relProjects = [] } = useQuery({
    queryKey: ["projects", "by-rel", relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, deadline, next_action_due")
        .or(`relationship_id.eq.${relationshipId},client_id.eq.${relationshipId}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectIds = relProjects.map((p: any) => p.id);
  const { data: relTasks = [] } = useQuery({
    queryKey: ["tasks", "by-rel", relationshipId, projectIds.length],
    queryFn: async () => {
      const orParts = [`relationship_id.eq.${relationshipId}`];
      if (projectIds.length) orParts.push(`project_id.in.(${projectIds.join(",")})`);
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status, due_date, blocked, project_id")
        .or(orParts.join(","))
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).filter((t: any) => !["Done","Complete","Completed","Cancelled","Canceled","Archived"].includes(t.status));
    },
  });

  const { data: proposalDoc } = useQuery({
    queryKey: ["documents", rel?.proposal_document_id],
    enabled: Boolean(rel?.proposal_document_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, drive_chat_link")
        .eq("id", rel!.proposal_document_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!rel) return null;

  const maturityMap = new Map(maturity.map((m) => [m.domain_slug, m]));

  return (
    <div className="space-y-5 pt-5">
      <div className="px-6">
        <JourneyStripAndBoard relationshipId={relationshipId} />
      </div>
      <div className="grid gap-5 px-6 lg:grid-cols-2">
      {/* Funnel */}
      <section className="panel-raised p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Funnel
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <FunnelStat label="Awareness" value={rel.awareness_tier} tone="iris" />
          <FunnelStat label="Temperature" value={rel.temperature} tone={tempTone(rel.temperature)} />
          <FunnelStat label="Drift risk" value={rel.drift_risk} tone={driftTone(rel.drift_risk)} />
        </div>
      </section>

      {/* Proposal */}
      <section className="panel-raised p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Proposal
        </h2>
        {proposalDoc ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">{proposalDoc.name}</div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {rel.proposal_version && <Chip tone="neutral">v{rel.proposal_version}</Chip>}
              {rel.proposal_sent_at && <span>Sent {new Date(rel.proposal_sent_at).toLocaleDateString()}</span>}
              {rel.proposal_expires_at && <span>· Expires {new Date(rel.proposal_expires_at).toLocaleDateString()}</span>}
            </div>
            {proposalDoc.drive_chat_link && (
              <a
                href={proposalDoc.drive_chat_link}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[color:var(--iris-violet)] hover:underline"
              >
                Open document →
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No proposal linked yet.</p>
        )}
      </section>

      {/* Maturity Map */}
      <section className="panel-raised p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Maturity Map
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {maturity.length} of {domains.length} assessed
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {domains.map((d) => {
            const m = maturityMap.get(d.slug);
            return (
              <div
                key={d.slug}
                className={`rounded-xl border p-2.5 text-xs ${levelBg(m?.current_level)}`}
              >
                <div className="truncate font-medium text-foreground">{d.name}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {m?.current_level ?? "Not assessed"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Engagement Plans */}
      <section className="panel-raised p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Engagement Plans
          </h2>
          <Link
            to="/engagement-plans"
            className="inline-flex items-center gap-1 rounded-lg bg-iris px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> New plan
          </Link>
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No engagement plans yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {plans.map((p: any) => (
              <li key={p.id}>
                <Link
                  to="/engagement-plans/$id"
                  params={{ id: p.id }}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-iris-soft/30"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.plan_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.start_date ?? "—"} → {p.end_date ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {p.total_revenue_usd != null && (
                      <span className="text-muted-foreground">
                        ${Number(p.total_revenue_usd).toLocaleString()}
                      </span>
                    )}
                    <Chip tone={planTone(p.status)}>{p.status}</Chip>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Projects */}
      <section className="panel-raised p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Projects
        </h2>
        {relProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects linked.</p>
        ) : (
          <ul className="divide-y divide-border">
            {relProjects.map((p: any) => (
              <li key={p.id}>
                <Link
                  to="/projects/$id"
                  params={{ id: p.id }}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-iris-soft/30"
                >
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                    {p.status && <Chip tone="neutral">{p.status}</Chip>}
                    {p.deadline && <span>{new Date(p.deadline).toLocaleDateString()}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Open tasks */}
      <section className="panel-raised p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Open tasks
        </h2>
        {relTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          <ul className="divide-y divide-border">
            {relTasks.map((t: any) => (
              <li key={t.id}>
                <Link
                  to="/tasks/$id"
                  params={{ id: t.id }}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-iris-soft/30"
                >
                  <span className="truncate">{t.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px]">
                    {t.blocked && <Chip tone="destructive">Blocked</Chip>}
                    {t.due_date && (
                      <span className="text-muted-foreground">
                        {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FunnelStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone: "iris" | "success" | "warning" | "destructive" | "neutral" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5">
        {value ? <Chip tone={tone}>{value}</Chip> : <span className="text-xs text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function tempTone(t: string | null): "success" | "warning" | "destructive" | "muted" {
  if (t === "Warm") return "success";
  if (t === "Cool") return "warning";
  if (t === "Cold") return "destructive";
  return "muted";
}
function driftTone(d: string | null): "success" | "warning" | "destructive" | "muted" {
  if (d === "None") return "success";
  if (d === "Low") return "muted";
  if (d === "Medium") return "warning";
  if (d === "High") return "destructive";
  return "muted";
}
function planTone(s: string | null): "neutral" | "iris" | "success" | "warning" | "muted" {
  if (s === "Proposed") return "warning";
  if (s === "Accepted" || s === "In Progress") return "iris";
  if (s === "Completed") return "success";
  if (s === "Cancelled") return "muted";
  return "neutral";
}
function levelBg(level: string | null | undefined): string {
  if (!level) return "border-border bg-muted/30";
  if (level.startsWith("L1")) return "border-destructive/30 bg-destructive/5";
  if (level.startsWith("L2")) return "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10";
  if (level.startsWith("L3")) return "border-border-strong bg-iris-soft/40";
  if (level.startsWith("L4")) return "border-[color:var(--success)]/30 bg-[color:var(--success)]/10";
  if (level.startsWith("L5")) return "border-[color:var(--iris-violet)]/40 bg-iris-soft";
  return "border-border bg-muted/30";
}
