import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { Chip } from "@/components/chips";
import { Plus, ExternalLink } from "lucide-react";
import { SweetCycleBoard, type SweetSession, type SweetPhase } from "@/components/sweetcycle-board";
import { useDragToStatus } from "@/hooks/use-drag-to-status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AWARENESS_TIER, RELATIONSHIP_TEMPERATURE, DRIFT_RISK } from "@/lib/enums";
import { ServiceShapeStrip } from "@/components/service-shape-strip";
import { MeasuresPanel } from "@/components/measures-panel";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/relationships/$id")({
  component: RelationshipDetail,
});

function RelationshipDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <ServiceShapeStrip relationshipId={id} />
      <RelationshipPanels relationshipId={id} />
      <EntityDetailPage entityKey="relationships" />
      <div className="px-6 pb-8">
        <MeasuresPanel subjectType="relationship" subjectId={id} />
      </div>
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
      {/* Funnel — inline editors */}
      <section className="panel-raised p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Funnel
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <FunnelEditor relationshipId={relationshipId} field="awareness_tier" label="Awareness" value={rel.awareness_tier} options={AWARENESS_TIER} tone="iris" />
          <FunnelEditor relationshipId={relationshipId} field="temperature" label="Temperature" value={rel.temperature} options={RELATIONSHIP_TEMPERATURE} tone={tempTone(rel.temperature)} />
          <FunnelEditor relationshipId={relationshipId} field="drift_risk" label="Drift risk" value={rel.drift_risk} options={DRIFT_RISK} tone={driftTone(rel.drift_risk)} />
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
    </div>
  );
}

function FunnelEditor<T extends string>({
  relationshipId,
  field,
  label,
  value,
  options,
  tone,
}: {
  relationshipId: string;
  field: "awareness_tier" | "temperature" | "drift_risk";
  label: string;
  value: string | null;
  options: readonly T[];
  tone: "iris" | "success" | "warning" | "destructive" | "neutral" | "muted";
}) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async (next: string | null) => {
      const { error } = await supabase.from("relationships").update({ [field]: next }).eq("id", relationshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relationships", "panels", relationshipId] });
      qc.invalidateQueries({ queryKey: ["relationship-journey"] });
      toast.success(`${label} updated`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5">
        <Select value={value ?? "__unset"} onValueChange={(v) => mut.mutate(v === "__unset" ? null : v)}>
          <SelectTrigger className="h-7 w-full border-0 bg-transparent p-0 text-xs hover:bg-muted/40">
            <SelectValue placeholder="—">
              {value ? <Chip tone={tone}>{value}</Chip> : <span className="text-xs text-muted-foreground">—</span>}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset">—</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function AddPortalButton({ relationshipId }: { relationshipId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("Pre-Mirror");
  const [version, setVersion] = useState("1");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("relationship_portals").insert({
        relationship_id: relationshipId,
        kind,
        version,
        url,
        notes: notes || null,
        delivered_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relationship_portals", relationshipId] });
      qc.invalidateQueries({ queryKey: ["relationship_journey", relationshipId] });
      qc.invalidateQueries({ queryKey: ["relationship-journey"] });
      toast.success("Portal logged");
      setOpen(false);
      setUrl("");
      setNotes("");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const KINDS = ["Pre-Mirror", "Pre-Map", "Pre-Machine", "Mirror Output", "Map Output", "Machine Output", "Sync", "Other"];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]">
          <Plus className="h-3 w-3" /> Add portal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log a portal artifact</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Kind</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Version</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!url || mut.isPending}>
            {mut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

const STAGE_TIMELINE = ["Pre-Engagement", "Mirror", "Map", "Machine", "Sync"] as const;

function JourneyStripAndBoard({ relationshipId }: { relationshipId: string }) {
  const { data: journey } = useQuery({
    queryKey: ["relationship_journey", relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationship_journey")
        .select("*")
        .eq("relationship_id", relationshipId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["engagement_services", "by-rel-active", relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_services")
        .select("id, service_type, status, sessions_purchased, sessions_used")
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const serviceIds = services.map((s: { id: string }) => s.id);
  const { data: sessionsByService = [] } = useQuery({
    queryKey: ["sessions", "by-services", serviceIds.join(",")],
    enabled: serviceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, name, sweetcycle_phase, phase_owner, phase_due_date, phase_blocker, session_date, engagement_service_id")
        .in("engagement_service_id", serviceIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: portals = [] } = useQuery({
    queryKey: ["relationship_portals", relationshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationship_portals")
        .select("id, kind, version, url, delivered_at, viewed_at, created_at")
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const currentStage = (() => {
    const s = (journey?.current_stage ?? "Pre-Engagement") as string;
    const lower = s.toLowerCase();
    if (lower.includes("mirror")) return "Mirror";
    if (lower.includes("map")) return "Map";
    if (lower.includes("machine")) return "Machine";
    if (lower.includes("sync")) return "Sync";
    return "Pre-Engagement";
  })();
  const stageIdx = STAGE_TIMELINE.indexOf(currentStage as (typeof STAGE_TIMELINE)[number]);

  return (
    <div className="space-y-4">
      {/* Journey strip */}
      <section className="panel-raised p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Journey
          </h2>
          <div className="flex items-center gap-2">
            {portals[0] && (
              <a
                href={portals[0].url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-iris/10 px-2.5 py-1 text-[11px] font-medium text-[color:var(--iris-violet)] transition-colors hover:bg-iris/20"
              >
                <ExternalLink className="h-3 w-3" />
                {portals[0].kind}
                {portals[0].version && ` v${portals[0].version}`}
                {portals[0].delivered_at && (
                  <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Delivered
                  </span>
                )}
              </a>
            )}
            <AddPortalButton relationshipId={relationshipId} />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {STAGE_TIMELINE.map((stage, i) => {
            const reached = i <= stageIdx;
            const current = i === stageIdx;
            return (
              <div key={stage} className="flex items-center gap-2">
                <div
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    current
                      ? "border-[color:var(--iris-violet)] bg-iris/15 text-[color:var(--iris-violet)] shadow-[var(--shadow-glow)]"
                      : reached
                        ? "border-border bg-muted/40 text-foreground"
                        : "border-dashed border-border/60 text-muted-foreground"
                  }`}
                >
                  {stage}
                </div>
                {i < STAGE_TIMELINE.length - 1 && (
                  <div className={`h-px w-6 ${i < stageIdx ? "bg-[color:var(--iris-violet)]" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
        {journey && (
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span>Sessions: {journey.ship_count}/{journey.total_session_count} shipped</span>
            {journey.current_phase && <span>· Current phase: <span className="font-medium text-foreground">{journey.current_phase}</span></span>}
            {journey.next_action_owner && <span>· Owner: <span className="font-medium text-foreground capitalize">{journey.next_action_owner}</span></span>}
            {journey.next_action_due && <span>· Due {journey.next_action_due}</span>}
          </div>
        )}
      </section>

      <SweetCycleSection
        services={services as Array<{ id: string; service_type: string; status: string }>}
        sessionsByService={sessionsByService as Array<SweetSession & { engagement_service_id?: string }>}
        relationshipId={relationshipId}
      />
    </div>
  );
}

function SweetCycleSection({
  services,
  sessionsByService,
  relationshipId,
}: {
  services: Array<{ id: string; service_type: string; status: string }>;
  sessionsByService: Array<SweetSession & { engagement_service_id?: string }>;
  relationshipId: string;
}) {
  const movePhase = useDragToStatus({
    table: "sessions",
    field: "sweetcycle_phase",
    label: "Phase",
    invalidate: [
      ["sessions"],
      ["relationship_journey", relationshipId],
      ["relationship-journey"],
    ],
  });
  return (
    <>
      {services
        .filter((s) => s.status === "Active" || s.status === "In Progress")
        .map((service) => {
          const sessions = sessionsByService.filter((s) => s.engagement_service_id === service.id);
          return (
            <section key={service.id} className="panel-raised p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  SweetCycle · {service.service_type}
                </h2>
                <Chip tone="iris">{service.status}</Chip>
              </div>
              <SweetCycleBoard
                sessions={sessions}
                emptyHint="No sessions linked to this service yet. Add sessions and set their Engagement Service to populate this board."
                onMove={(id, phase: SweetPhase) => movePhase.mutate({ id, value: phase })}
              />
            </section>
          );
        })}
    </>
  );
}
