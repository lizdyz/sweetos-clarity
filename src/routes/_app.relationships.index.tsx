import { createFileRoute, Link } from "@tanstack/react-router";
import { RelationshipCreateSheet } from "@/components/relationship-create-sheet";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/chips";
import { HeatRing, type Heat } from "@/components/heat-ring";
import { PageHeader } from "@/components/page-header";
import { Search, Filter, Users, Thermometer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/relationships/")({
  component: RelationshipsIndexPage,
});

interface JourneyRow {
  relationship_id: string;
  name: string;
  pipeline_stage: string | null;
  awareness_tier: string | null;
  temperature: string | null;
  drift_risk: string | null;
  primary_service: string | null;
  service_status: string | null;
  current_stage: string | null;
  current_phase: string | null;
  next_action_due: string | null;
  current_blocker: string | null;
  ship_count: number | null;
  total_session_count: number | null;
}

const STAGE_ORDER = [
  "1. Awareness",
  "2. Interest",
  "3. Proposal Sent",
  "4. Active Engagement",
  "5. Client",
  "On Hold",
  "Inactive",
];

type ChipTone = "neutral" | "iris" | "success" | "warning" | "destructive" | "muted";
function tempTone(t: string | null): ChipTone {
  switch (t) {
    case "🔥 Hot":
      return "destructive";
    case "🌤️ Warm":
      return "warning";
    case "❄️ Cold":
      return "neutral";
    case "🌑 Dormant":
      return "muted";
    default:
      return "muted";
  }
}
function driftTone(d: string | null): ChipTone {
  switch (d) {
    case "🚨 Critical":
      return "destructive";
    case "⚠️ At Risk":
      return "warning";
    case "✅ On Track":
      return "success";
    default:
      return "muted";
  }
}
function heatFromJourney(r: JourneyRow): Heat {
  if (r.drift_risk === "🚨 Critical") return "red";
  if (r.drift_risk === "⚠️ At Risk" || r.current_blocker) return "amber";
  return "neutral";
}

type SortMode = "stage" | "temp" | "drift" | "recent";

function RelationshipsIndexPage() {
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [hasSubOnly, setHasSubOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("stage");
  const [createOpen, setCreateOpen] = useState(false);

  const { data = [] } = useQuery<JourneyRow[]>({
    queryKey: ["relationship-journey-index"],
    queryFn: async () => {
      const { data, error } = await sb.from("relationship_journey").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = data.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (stageFilter && r.pipeline_stage !== stageFilter) return false;
      if (hasSubOnly && r.primary_service !== "SweetSync") return false;
      return true;
    });
    list.sort((a, b) => {
      if (sort === "stage") {
        return STAGE_ORDER.indexOf(a.pipeline_stage ?? "") - STAGE_ORDER.indexOf(b.pipeline_stage ?? "");
      }
      if (sort === "temp") {
        const order = ["🔥 Hot", "🌤️ Warm", "❄️ Cold", "🌑 Dormant"];
        return order.indexOf(a.temperature ?? "") - order.indexOf(b.temperature ?? "");
      }
      if (sort === "drift") {
        const order = ["🚨 Critical", "⚠️ At Risk", "✅ On Track"];
        return order.indexOf(a.drift_risk ?? "") - order.indexOf(b.drift_risk ?? "");
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [data, q, stageFilter, hasSubOnly, sort]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-6">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title="Relationships"
        purpose="Every person and company in your orbit, scored by pipeline stage, temperature, and drift risk. The unit of engagement — every plan, project, and session anchors here."
        whatYouCanDo={[
          "Filter by stage, sort by temperature or drift",
          "Open a relationship to see its journey, services, and SweetCycle",
          "Spot at-risk clients via drift chips and heat rings",
        ]}
        connectsTo={[
          { to: "/sweetcycle", label: "SweetCycle" },
          { to: "/engagement-plans", label: "Engagement Plans" },
          { to: "/sessions", label: "Sessions" },
          { to: "/flightdeck", label: "Flightdeck" },
        ]}
        nextSteps={[`${data.length} total`]}
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}>+ Add relationship</Button>}
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3 w-3" /> Stage
          </div>
          <button
            onClick={() => setStageFilter(null)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium",
              !stageFilter ? "border-iris bg-iris-soft" : "border-border bg-background hover:bg-muted",
            )}
          >
            All
          </button>
          {STAGE_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                stageFilter === s
                  ? "border-iris bg-iris-soft"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {s}
            </button>
          ))}

          <span className="ml-2 text-[11px] uppercase tracking-wider text-muted-foreground">Sort</span>
          {(
            [
              { id: "stage", label: "Stage" },
              { id: "temp", label: "Temperature" },
              { id: "drift", label: "Drift risk" },
              { id: "recent", label: "Name" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSort(opt.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                sort === opt.id
                  ? "border-iris bg-iris-soft"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}

          <button
            onClick={() => setHasSubOnly((v) => !v)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium",
              hasSubOnly ? "border-iris bg-iris-soft" : "border-border bg-background hover:bg-muted",
            )}
          >
            SweetSync only
          </button>

          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-8 w-[200px] pl-7 text-xs"
            />
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No relationships match these filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const heat = heatFromJourney(r);
            return (
              <HeatRing key={r.relationship_id} heat={heat}>
                <Link to="/relationships/$id" params={{ id: r.relationship_id }}>
                  <Card className="h-full p-4 transition-colors hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.name}</div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {r.pipeline_stage ?? "No stage"}
                        </div>
                      </div>
                      {r.primary_service && (
                        <Chip tone="iris" className="h-5">
                          {r.primary_service}
                        </Chip>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.temperature && (
                        <Chip tone={tempTone(r.temperature)} className="h-5 text-[10px]">
                          <Thermometer className="h-2.5 w-2.5" />
                          {r.temperature}
                        </Chip>
                      )}
                      {r.drift_risk && (
                        <Chip tone={driftTone(r.drift_risk)} className="h-5 text-[10px]">
                          {r.drift_risk}
                        </Chip>
                      )}
                      {r.current_stage && (
                        <Chip tone="neutral" className="h-5 text-[10px]">
                          {r.current_phase ? `${r.current_phase} · ` : ""}{r.current_stage}
                        </Chip>
                      )}
                    </div>

                    {r.current_blocker && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="line-clamp-2">{r.current_blocker}</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {r.ship_count ?? 0} shipped · {r.total_session_count ?? 0} sessions
                      </span>
                      {r.next_action_due && <span>Next: {r.next_action_due}</span>}
                    </div>
                  </Card>
                </Link>
              </HeatRing>
            );
          })}
        </div>
      )}

      <RelationshipCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
