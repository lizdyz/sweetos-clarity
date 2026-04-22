import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, Clock, ExternalLink, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { StageSwimlanes } from "@/components/stage-swimlanes";
import { useDragToStatus } from "@/hooks/use-drag-to-status";

export const Route = createFileRoute("/_app/journey")({
  component: JourneyPage,
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

function JourneyPage() {
  const navigate = useNavigate();
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

  const moveStage = useDragToStatus({
    table: "relationships",
    field: "pipeline_stage",
    label: "Stage",
    invalidate: [["relationship-journey"], ["relationships"]],
  });

  const items = (rows ?? []).map((r) => ({
    id: r.relationship_id,
    stage: normalizeStage(r.current_stage),
    row: r,
  }));

  const today = new Date();
  const week = new Date();
  week.setDate(today.getDate() + 7);
  const batons = (rows ?? []).filter((r) => {
    if (!r.next_action_due) return false;
    const d = new Date(r.next_action_due);
    return d >= new Date(today.toDateString()) && d <= week;
  });
  const atRisk = (rows ?? []).filter((r) => r.drift_risk || r.current_blocker);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris/10 text-[color:var(--iris-violet)]">
          <MapIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journey</h1>
          <p className="text-sm text-muted-foreground">
            Drag a card across stages. Every status field is a board.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Stage swimlanes</h2>
          <span className="text-[11px] text-muted-foreground">
            {rows?.length ?? 0} relationships · {isLoading ? "loading…" : "drag to advance"}
          </span>
        </div>
        <StageSwimlanes
          columns={STAGES}
          hints={STAGE_HINTS}
          items={items}
          onMove={(id, newStage) => moveStage.mutate({ id, value: newStage })}
          renderCard={({ row: r }) => (
            <div
              onClick={() => navigate({ to: "/relationships/$id", params: { id: r.relationship_id } })}
              className="rounded-lg border border-border/50 bg-background p-2 text-xs shadow-sm transition-all hover:border-iris/40"
            >
              <div className="line-clamp-1 font-medium">{r.name}</div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="line-clamp-1 text-[10px] text-muted-foreground">
                  {r.primary_service ?? "—"}
                </span>
                <OwnerPill owner={r.next_action_owner} />
              </div>
              {r.next_action_due && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {r.next_action_due}
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
          )}
        />
      </Card>

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

      <ComponentsInFlightPanel />
    </div>
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
