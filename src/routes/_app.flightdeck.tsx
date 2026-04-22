import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, ExternalLink, Plane, ShieldCheck, Target, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StageSwimlanes } from "@/components/stage-swimlanes";
import { useDragToStatus } from "@/hooks/use-drag-to-status";
import { DueDateChip } from "@/components/due-date-chip";
import { SERVICE_PACKAGE, SERVICE_PACKAGE_BADGE, type ServicePackage } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/flightdeck")({
  component: FlightdeckPage,
});

const STAGES = [
  "Awareness",
  "Pre-Engagement",
  "Mirror",
  "Map",
  "Machine",
  "Sync",
] as const;

const STAGE_HINTS: Record<string, string> = {
  Awareness: "Cold or curious",
  "Pre-Engagement": "Tools shipped",
  Mirror: "22-domain scan",
  Map: "Roadmap build",
  Machine: "Build sprint",
  Sync: "Recap & ship",
};

type JourneyRow = {
  relationship_id: string;
  name: string;
  current_stage: string | null;
  primary_service: string | null;
  service_status: string | null;
  current_phase: string | null;
  next_action_owner: "client" | "us" | "both" | null;
  next_action_due: string | null;
  current_blocker: string | null;
  ship_count: number;
  total_session_count: number;
  latest_portal_url: string | null;
  latest_portal_kind: string | null;
  drift_risk: string | null;
};

function normalizeStage(stage: string | null): (typeof STAGES)[number] {
  if (!stage) return "Pre-Engagement";
  const s = stage.toLowerCase();
  if (s.includes("aware")) return "Awareness";
  if (s.includes("pre-mirror") || s.includes("pre-engagement") || s.includes("interest") || s.includes("proposal"))
    return "Pre-Engagement";
  if (s.includes("mirror")) return "Mirror";
  if (s.includes("map")) return "Map";
  if (s.includes("machine") || s.includes("active") || s.includes("client")) return "Machine";
  if (s.includes("sync")) return "Sync";
  return "Pre-Engagement";
}

function OwnerPill({ owner }: { owner: JourneyRow["next_action_owner"] }) {
  if (!owner) return <span className="text-[10px] text-muted-foreground">—</span>;
  const cls =
    owner === "client"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : owner === "us"
        ? "bg-iris/10 text-[color:var(--iris-violet)]"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize", cls)}>
      {owner}
    </span>
  );
}

function FlightdeckPage() {
  const navigate = useNavigate();
  const [pkgFilter, setPkgFilter] = useState<"All" | ServicePackage | "Unscoped">("All");

  const { data: rows, isLoading } = useQuery<JourneyRow[]>({
    queryKey: ["relationship-journey"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationship_journey")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: packages = [] } = useQuery<Array<{ id: string; service_package: string | null }>>({
    queryKey: ["relationships", "service-packages-all"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationships")
        .select("id, service_package");
      if (error) throw error;
      return data ?? [];
    },
  });

  const pkgById = useMemo(() => {
    const m = new Map<string, string | null>();
    packages.forEach((p) => m.set(p.id, p.service_package));
    return m;
  }, [packages]);

  const moveStage = useDragToStatus({
    table: "relationships",
    field: "pipeline_stage",
    label: "Stage",
    invalidate: [["relationship-journey"], ["relationships"]],
  });

  const filteredRows = (rows ?? []).filter((r) => {
    if (pkgFilter === "All") return true;
    const p = pkgById.get(r.relationship_id) ?? null;
    if (pkgFilter === "Unscoped") return !p;
    return p === pkgFilter;
  });

  const items = filteredRows.map((r) => ({
    id: r.relationship_id,
    stage: normalizeStage(r.current_stage),
    row: r,
  }));

  const today = new Date();
  const week = new Date();
  week.setDate(today.getDate() + 7);
  const batons = filteredRows.filter((r) => {
    if (!r.next_action_due) return false;
    const d = new Date(r.next_action_due);
    return d >= new Date(today.toDateString()) && d <= week;
  });
  const atRisk = filteredRows.filter((r) => r.drift_risk || r.current_blocker);

  const filterChips: Array<"All" | ServicePackage | "Unscoped"> = [
    "All",
    ...SERVICE_PACKAGE,
    "Unscoped",
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris/10 text-[color:var(--iris-violet)]">
          <Plane className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flightdeck</h1>
          <p className="text-sm text-muted-foreground">
            Who's flying which engagement. Drag a card across stages.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">Package</span>
        {filterChips.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={pkgFilter === p ? "default" : "outline"}
            onClick={() => setPkgFilter(p)}
            className="h-6 px-2 text-[11px]"
          >
            {p}
          </Button>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Stage swimlanes</h2>
          <span className="text-[11px] text-muted-foreground">
            {filteredRows.length} of {rows?.length ?? 0} relationships · {isLoading ? "loading…" : "drag to advance"}
          </span>
        </div>
        <StageSwimlanes
          columns={STAGES}
          hints={STAGE_HINTS}
          items={items}
          onMove={(id, newStage) => moveStage.mutate({ id, value: newStage })}
          renderCard={({ row: r }) => {
            const pkg = pkgById.get(r.relationship_id) as ServicePackage | null;
            return (
              <div
                onClick={() => navigate({ to: "/relationships/$id", params: { id: r.relationship_id } })}
                className="rounded-lg border border-border/50 bg-background p-2 text-xs shadow-sm transition-all hover:border-iris/40"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="line-clamp-1 font-medium">{r.name}</div>
                  {pkg && (
                    <Badge variant="secondary" className="h-4 text-[9px]">
                      {SERVICE_PACKAGE_BADGE[pkg]}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="line-clamp-1 text-[10px] text-muted-foreground">
                    {r.primary_service ?? "—"}
                  </span>
                  <OwnerPill owner={r.next_action_owner} />
                </div>
                {r.next_action_due && (
                  <div className="mt-1">
                    <DueDateChip due={r.next_action_due} />
                  </div>
                )}
                {r.latest_portal_url && (
                  <a
                    href={r.latest_portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-[color:var(--iris-violet)] hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Portal
                  </a>
                )}
              </div>
            );
          }}
        />
      </Card>

      <DueThisWeekPanel />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">This week's batons</h2>
            <Badge variant="secondary" className="h-5 text-[10px]">{batons.length}</Badge>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : batons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              No phase handoffs due in the next 7 days.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {batons.map((r) => (
                <li key={r.relationship_id}>
                  <Link
                    to="/relationships/$id"
                    params={{ id: r.relationship_id }}
                    className="flex items-center gap-2 rounded-lg border border-border/40 bg-background p-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {r.current_phase ?? "—"} · due {r.next_action_due}
                      </div>
                    </div>
                    <OwnerPill owner={r.next_action_owner} />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">At risk</h2>
            <Badge variant="secondary" className="h-5 text-[10px]">{atRisk.length}</Badge>
          </div>
          {atRisk.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              Nothing flagged.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {atRisk.map((r) => (
                <li key={r.relationship_id}>
                  <Link
                    to="/relationships/$id"
                    params={{ id: r.relationship_id }}
                    className="flex items-start gap-2 rounded-lg border border-border/40 bg-background p-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {r.drift_risk ? `Drift: ${r.drift_risk}` : ""}
                        {r.drift_risk && r.current_blocker ? " · " : ""}
                        {r.current_blocker ?? ""}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DoneLogPanel />

      <ApprovalsPanel />

      <MeasuresDuePanel />

      <ComponentsInFlightPanel />
    </div>
  );
}

type DoneLogRow = {
  entity_type: string;
  entity_id: string;
  name: string | null;
  done_at: string;
  relationship_id: string | null;
};

function DoneLogPanel() {
  const { data: rows = [] } = useQuery<DoneLogRow[]>({
    queryKey: ["recent-done-log"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("recent_done_log" as never)
        .select("*")
        .order("done_at", { ascending: false })
        .limit(60);
      if (error) return [];
      return (data ?? []) as DoneLogRow[];
    },
  });

  const byDay = useMemo(() => {
    const m = new Map<string, DoneLogRow[]>();
    rows.forEach((r) => {
      const day = new Date(r.done_at).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const arr = m.get(day) ?? [];
      arr.push(r);
      m.set(day, arr);
    });
    return Array.from(m.entries());
  }, [rows]);

  const TYPE_TO_PATH: Record<string, string> = {
    task: "/tasks/$id",
    project: "/projects/$id",
    session: "/sessions/$id",
    spark: "/sparks/$id",
    outcome: "/outcomes/$id",
  };

  const TYPE_TONE: Record<string, string> = {
    task: "bg-iris/10 text-[color:var(--iris-violet)]",
    project: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    session: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    spark: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    outcome: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Done log · last 14 days</h2>
        <Badge variant="secondary" className="h-5 text-[10px]">{rows.length}</Badge>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          No completions in the last 14 days.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {byDay.map(([day, items]) => (
            <div key={day} className="rounded-xl border border-border/50 bg-card/40 p-2.5">
              <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {day} · {items.length}
              </div>
              <ul className="space-y-1">
                {items.map((it) => (
                  <li key={`${it.entity_type}-${it.entity_id}`}>
                    <Link
                      to={TYPE_TO_PATH[it.entity_type] ?? "/today"}
                      params={{ id: it.entity_id }}
                      className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background p-2 text-xs hover:border-iris/40"
                    >
                      <span
                        className={cn(
                          "rounded px-1 py-0 text-[9px] font-semibold uppercase tracking-wider",
                          TYPE_TONE[it.entity_type] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {it.entity_type}
                      </span>
                      <span className="line-clamp-1 flex-1">{it.name ?? "Untitled"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

type ComponentRow = {
  id: string;
  name: string;
  current_maturity_level: string | null;
  related_domains: string[] | null;
  updated_at: string;
};

function ComponentsInFlightPanel() {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceIso = since.toISOString();

  const { data: comps = [] } = useQuery<ComponentRow[]>({
    queryKey: ["components-in-flight", sinceIso],
    queryFn: async () => {
      const { data, error } = await sb
        .from("components")
        .select("id, name, current_maturity_level, related_domains, updated_at")
        .gte("updated_at", sinceIso)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const byDomain = new Map<string, ComponentRow[]>();
  comps.forEach((c) => {
    const domains = c.related_domains?.length ? c.related_domains : ["unassigned"];
    domains.forEach((d) => {
      const arr = byDomain.get(d) ?? [];
      arr.push(c);
      byDomain.set(d, arr);
    });
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Components in flight</h2>
        <span className="text-[11px] text-muted-foreground">
          touched in last 14 days · {comps.length}
        </span>
      </div>
      {comps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          No components updated recently.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from(byDomain.entries()).map(([domain, list]) => (
            <div key={domain} className="rounded-xl border border-border/50 bg-card/40 p-2.5">
              <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {domain}
              </div>
              <ul className="space-y-1">
                {list.slice(0, 5).map((c) => (
                  <li key={`${domain}-${c.id}`}>
                    <Link
                      to="/components/$id"
                      params={{ id: c.id }}
                      className="block rounded-lg border border-border/40 bg-background p-2 text-xs hover:border-iris/40"
                    >
                      <div className="line-clamp-1 font-medium">{c.name}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {c.current_maturity_level ?? "—"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DueThisWeekPanel() {
  const today = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(today.getDate() + 7);
  const todayIso = today.toISOString().slice(0, 10);
  const weekEndIso = weekEnd.toISOString().slice(0, 10);

  const { data: tasks = [] } = useQuery<Array<{ id: string; name: string; due_date: string }>>({
    queryKey: ["due-week", "tasks", todayIso],
    queryFn: async () => {
      const { data, error } = await sb
        .from("tasks")
        .select("id, name, due_date, status")
        .gte("due_date", todayIso)
        .lte("due_date", weekEndIso)
        .order("due_date");
      if (error) return [];
      return (data ?? []).filter((t: { status?: string }) => (t.status ?? "") !== "Done");
    },
  });

  const { data: projects = [] } = useQuery<Array<{ id: string; name: string; deadline: string }>>({
    queryKey: ["due-week", "projects", todayIso],
    queryFn: async () => {
      const { data, error } = await sb
        .from("projects")
        .select("id, name, deadline")
        .gte("deadline", todayIso)
        .lte("deadline", weekEndIso)
        .order("deadline");
      if (error) return [];
      return data ?? [];
    },
  });

  const { data: campaigns = [] } = useQuery<Array<{ id: string; campaign_name: string; deadline: string }>>({
    queryKey: ["due-week", "campaigns", todayIso],
    queryFn: async () => {
      const { data, error } = await sb
        .from("campaigns")
        .select("id, campaign_name, deadline")
        .gte("deadline", todayIso)
        .lte("deadline", weekEndIso)
        .order("deadline");
      if (error) return [];
      return data ?? [];
    },
  });

  const total = tasks.length + projects.length + campaigns.length;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Due this week</h2>
        <Badge variant="secondary" className="h-5 text-[10px]">{total}</Badge>
      </div>
      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          Nothing due in the next 7 days.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <DueGroup title="Tasks" items={tasks.map((t) => ({ id: t.id, label: t.name, due: t.due_date, to: "/tasks/$id" }))} />
          <DueGroup title="Projects" items={projects.map((p) => ({ id: p.id, label: p.name, due: p.deadline, to: "/projects/$id" }))} />
          <DueGroup title="Campaigns" items={campaigns.map((c) => ({ id: c.id, label: c.campaign_name, due: c.deadline, to: "/campaigns/$id" }))} />
        </div>
      )}
    </Card>
  );
}

function DueGroup({ title, items }: { title: string; items: Array<{ id: string; label: string; due: string; to: string }> }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-2.5">
      <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title} · {items.length}
      </div>
      {items.length === 0 ? (
        <div className="px-1 py-2 text-[11px] text-muted-foreground">None</div>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={`${title}-${it.id}`}>
              <Link
                to={it.to}
                params={{ id: it.id }}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background p-2 text-xs hover:border-iris/40"
              >
                <span className="line-clamp-1 flex-1">{it.label}</span>
                <DueDateChip due={it.due} showIcon={false} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ===== Approvals panel =====

type ApprovalRow = {
  step_run_id: string;
  run_id: string;
  workflow_id: string;
  step_name: string | null;
  approval_role: string | null;
  approval_requested_at: string | null;
};

function ApprovalsPanel() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();

  const { data: rows = [] } = useQuery<ApprovalRow[]>({
    queryKey: ["approvals-awaiting"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("workflow_step_pipeline" as never)
        .select("step_run_id, run_id, workflow_id, name, approval_role, run_status")
        .eq("run_status", "awaiting_approval");
      if (error) return [];
      return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
        step_run_id: r.step_run_id as string,
        run_id: r.run_id as string,
        workflow_id: r.workflow_id as string,
        step_name: (r.name as string) ?? null,
        approval_role: (r.approval_role as string) ?? null,
        approval_requested_at: null,
      }));
    },
  });

  const visible = rows.filter((r) => {
    if (!user) return false;
    if (r.approval_role === "any_team_member") return true;
    if (r.approval_role === "admin" || r.approval_role === "owner") return isAdmin;
    return false;
  });

  const decide = useMutation({
    mutationFn: async ({ row, approve }: { row: ApprovalRow; approve: boolean }) => {
      const status = approve ? "done" : "rejected";
      const { error } = await sb
        .from("workflow_step_runs" as never)
        .update({
          status,
          approval_decision: approve ? "approved" : "rejected",
          approval_by: user?.id ?? null,
          approval_at: new Date().toISOString(),
          completed_at: approve ? new Date().toISOString() : null,
        } as never)
        .eq("id", row.step_run_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals-awaiting"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold tracking-tight">Awaiting your approval</h2>
        </div>
        <Badge variant="secondary" className="h-5 text-[10px]">{visible.length}</Badge>
      </div>
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          No workflow steps awaiting your approval.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((r) => (
            <li
              key={r.step_run_id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background p-2.5 text-sm"
            >
              <Link
                to="/workflows/$id/runs/$runId"
                params={{ id: r.workflow_id, runId: r.run_id }}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                <span className="font-medium">{r.step_name ?? "Step"}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  · {r.approval_role ?? "—"}
                </span>
              </Link>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => decide.mutate({ row: r, approve: false })}
                  disabled={decide.isPending}
                >
                  <XCircle className="mr-1 h-3 w-3" /> Reject
                </Button>
                <Button
                  size="sm"
                  className="h-7 bg-iris text-white text-xs"
                  onClick={() => decide.mutate({ row: r, approve: true })}
                  disabled={decide.isPending}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ===== Measures due for reading =====

type DueMeasureRow = {
  measure_id: string;
  name: string;
  cadence: string;
  status_color: string | null;
  last_reading_at: string | null;
  subject_type: string;
  subject_id: string;
};

const CADENCE_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  per_event: 365,
};

function MeasuresDuePanel() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<DueMeasureRow[]>({
    queryKey: ["measures-due"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("measure_health" as never)
        .select("measure_id, name, cadence, status_color, last_reading_at, subject_type, subject_id");
      if (error) return [];
      return (data ?? []) as DueMeasureRow[];
    },
  });

  const due = rows.filter((r) => {
    const days = CADENCE_DAYS[r.cadence] ?? 30;
    if (!r.last_reading_at) return true;
    const last = new Date(r.last_reading_at).getTime();
    const ageDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
    return ageDays >= days;
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-iris" />
          <h2 className="text-sm font-semibold tracking-tight">Measures due for reading</h2>
        </div>
        <Badge variant="secondary" className="h-5 text-[10px]">{due.length}</Badge>
      </div>
      {due.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          All measures are up to date.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {due.slice(0, 12).map((r) => (
            <DueMeasureRowEditor
              key={r.measure_id}
              row={r}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["measures-due"] });
                qc.invalidateQueries({ queryKey: ["measure_health"] });
              }}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function DueMeasureRowEditor({ row, onSaved }: { row: DueMeasureRow; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const v = Number(value);
    if (!Number.isFinite(v)) return;
    setBusy(true);
    try {
      const { error } = await sb
        .from("measure_readings" as never)
        .insert({ measure_id: row.measure_id, value: v, source: "manual" } as never);
      if (error) throw error;
      setValue("");
      onSaved();
      toast.success("Reading recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background p-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <span className="font-medium">{row.name}</span>
        <span className="ml-2 text-[11px] text-muted-foreground">
          · {row.cadence} · last {row.last_reading_at ? new Date(row.last_reading_at).toLocaleDateString() : "never"}
        </span>
      </div>
      <Input
        type="number"
        step="any"
        value={value}
        placeholder="value"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="h-7 w-24 text-[11px]"
        disabled={busy}
      />
      <Button size="sm" className="h-7 text-xs" onClick={save} disabled={busy || !value}>
        Record
      </Button>
    </li>
  );
}

