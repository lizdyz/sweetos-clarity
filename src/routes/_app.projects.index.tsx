import { createFileRoute, Link } from "@tanstack/react-router";
import { ProjectCreateSheet } from "@/components/project-create-sheet";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RollupStatChip } from "@/components/rollup-stat-chip";
import { HeatRing, heatFromRollup } from "@/components/heat-ring";
import { Chip } from "@/components/chips";
import {
  Search,
  Filter,
  Folders,
  Flame,
  AlertTriangle,
  Clock,
  CalendarClock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isPast } from "date-fns";

export const Route = createFileRoute("/_app/projects/")({
  component: ProjectsIndexPage,
});

interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  owner: string | null;
  priority: string | null;
  deadline: string | null;
  relationship_id: string | null;
  updated_at: string;
  created_by: string;
}
interface RollupRow {
  project_id: string;
  total_tasks: number | null;
  open_tasks: number | null;
  blocked_tasks: number | null;
  overdue_tasks: number | null;
  next_due_date: string | null;
  owners: string[] | null;
}
interface RelMin {
  id: string;
  name: string;
}

type FilterMode = "all" | "stuck" | "mine";
type SortMode = "overdue" | "due" | "recent";

function ProjectsIndexPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("overdue");
  const [relFilter, setRelFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects = [] } = useQuery<ProjectRow[]>({
    queryKey: ["projects-index"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("projects")
        .select("id, name, status, owner, priority, deadline, relationship_id, updated_at, created_by")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rollups = [] } = useQuery<RollupRow[]>({
    queryKey: ["projects-rollup"],
    queryFn: async () => {
      const { data, error } = await sb.from("project_rollup").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rels = [] } = useQuery<RelMin[]>({
    queryKey: ["relationships-min-for-projects"],
    queryFn: async () => {
      const { data, error } = await sb.from("relationships").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rollupMap = useMemo(() => {
    const m = new Map<string, RollupRow>();
    rollups.forEach((r) => m.set(r.project_id, r));
    return m;
  }, [rollups]);
  const relMap = useMemo(() => {
    const m = new Map<string, string>();
    rels.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [rels]);

  const filtered = useMemo(() => {
    const list = projects
      .map((p) => ({ p, r: rollupMap.get(p.id) }))
      .filter(({ p, r }) => {
        if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
        if (relFilter && p.relationship_id !== relFilter) return false;
        if (mode === "mine" && p.created_by !== user?.id) return false;
        if (mode === "stuck") {
          const overdue = r?.overdue_tasks ?? 0;
          const blocked = r?.blocked_tasks ?? 0;
          if (overdue + blocked === 0) return false;
        }
        return true;
      });
    list.sort((a, b) => {
      if (sort === "overdue") {
        return (b.r?.overdue_tasks ?? 0) - (a.r?.overdue_tasks ?? 0);
      }
      if (sort === "due") {
        const ad = a.r?.next_due_date ? new Date(a.r.next_due_date).getTime() : Infinity;
        const bd = b.r?.next_due_date ? new Date(b.r.next_due_date).getTime() : Infinity;
        return ad - bd;
      }
      return new Date(b.p.updated_at).getTime() - new Date(a.p.updated_at).getTime();
    });
    return list;
  }, [projects, rollupMap, q, mode, relFilter, sort, user?.id]);

  const stuckCount = useMemo(
    () =>
      projects.filter((p) => {
        const r = rollupMap.get(p.id);
        return (r?.overdue_tasks ?? 0) + (r?.blocked_tasks ?? 0) > 0;
      }).length,
    [projects, rollupMap],
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris/10 text-[color:var(--iris-violet)]">
          <Folders className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} total · <span className="font-medium text-destructive">{stuckCount} stuck</span> (overdue or blocked)
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ New project</Button>
      </header>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3 w-3" /> Show
          </div>
          {(
            [
              { id: "all", label: "All", icon: null },
              { id: "stuck", label: `Stuck (${stuckCount})`, icon: <Flame className="h-3 w-3" /> },
              { id: "mine", label: "Mine", icon: null },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                mode === opt.id
                  ? "border-iris bg-iris-soft"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}

          <span className="ml-2 text-[11px] uppercase tracking-wider text-muted-foreground">Sort</span>
          {(
            [
              { id: "overdue", label: "Overdue first" },
              { id: "due", label: "Soonest due" },
              { id: "recent", label: "Recently touched" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSort(opt.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                sort === opt.id
                  ? "border-iris bg-iris-soft"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}

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

        {relFilter && (
          <div className="mt-2">
            <button
              onClick={() => setRelFilter(null)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-iris-soft px-2 py-0.5 text-[10px] font-medium hover:bg-iris/20"
            >
              Relationship: {relMap.get(relFilter) ?? relFilter} <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No projects match these filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ p, r }) => {
            const heat = heatFromRollup({
              overdue: r?.overdue_tasks,
              blocked: r?.blocked_tasks,
            });
            const nextDue = r?.next_due_date ? parseISO(r.next_due_date) : null;
            const overdueDue = nextDue ? isPast(nextDue) : false;
            return (
              <HeatRing key={p.id} heat={heat}>
                <Link to="/projects/$id" params={{ id: p.id }}>
                  <Card className="h-full p-4 transition-colors hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.name}</div>
                        {p.relationship_id && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setRelFilter(p.relationship_id);
                            }}
                            className="mt-0.5 truncate text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            {relMap.get(p.relationship_id) ?? "—"}
                          </button>
                        )}
                      </div>
                      {p.status && (
                        <Chip tone="neutral" className="h-5">
                          {p.status}
                        </Chip>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <RollupStatChip
                        label="open"
                        value={r?.open_tasks ?? 0}
                        tone="neutral"
                      />
                      <RollupStatChip
                        label="blocked"
                        value={r?.blocked_tasks ?? 0}
                        tone={(r?.blocked_tasks ?? 0) > 0 ? "amber" : "neutral"}
                        icon={<AlertTriangle className="h-2.5 w-2.5" />}
                      />
                      <RollupStatChip
                        label="overdue"
                        value={r?.overdue_tasks ?? 0}
                        tone={(r?.overdue_tasks ?? 0) > 0 ? "red" : "neutral"}
                        icon={<Flame className="h-2.5 w-2.5" />}
                      />
                      {nextDue && (
                        <RollupStatChip
                          label={overdueDue ? "past due" : "next"}
                          value={format(nextDue, "MMM d")}
                          tone={overdueDue ? "red" : "neutral"}
                          icon={<CalendarClock className="h-2.5 w-2.5" />}
                        />
                      )}
                    </div>

                    {(r?.owners?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(r?.owners ?? []).slice(0, 4).map((o) => (
                          <span
                            key={o}
                            className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
                          >
                            {o}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Updated {format(parseISO(p.updated_at), "MMM d")}
                    </div>
                  </Card>
                </Link>
              </HeatRing>
            );
          })}
        </div>
      )}

      <ProjectCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
