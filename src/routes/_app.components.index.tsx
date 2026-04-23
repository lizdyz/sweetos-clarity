import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TENETS_BY_CATEGORY } from "@/lib/tenets";
import { Filter, Search, Blocks, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { RollupStatChip } from "@/components/rollup-stat-chip";
import { ComponentKindToggle, type ComponentKind } from "@/components/component-kind-toggle";
import { CapabilitiesDerivedPanel } from "@/components/capabilities-derived-panel";
import { formatDistanceToNow, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/components/")({
  component: ComponentsListPage,
});

interface ComponentRow {
  id: string;
  name: string;
  description: string | null;
  current_maturity_level: string | null;
  quality_status: string | null;
  related_domains: string[] | null;
  related_tenets: string[] | null;
  updated_at: string;
  component_kind: ComponentKind | null;
  journey_id: string | null;
}
interface JourneyRow { id: string; name: string; }
interface PipelineRow {
  component_id: string;
  active_project_count: number | null;
  active_task_count: number | null;
}
interface DomainRow {
  slug: string;
  name: string;
}

const ALL = "__all__";
type Mode = "all" | "active" | "stalled";
type SortMode = "moved" | "maturity" | "alpha";

const MATURITY_ORDER: Record<string, number> = {
  "L1 Lacking": 1,
  "L2 Learning": 2,
  "L3 Launching": 3,
  "L4 Leveraging": 4,
  "L5 Leading": 5,
};

function ComponentsListPage() {
  const [domain, setDomain] = useState<string>(ALL);
  const [tenet, setTenet] = useState<string>(ALL);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [sort, setSort] = useState<SortMode>("moved");
  const [kind, setKind] = useState<ComponentKind>("user");

  const { data: domains = [] } = useQuery<DomainRow[]>({
    queryKey: ["domains-min"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("domains")
        .select("slug, name")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery<ComponentRow[]>({
    queryKey: ["components-list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("components")
        .select(
          "id, name, description, current_maturity_level, quality_status, related_domains, related_tenets, updated_at, component_kind, journey_id",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pipeline = [] } = useQuery<PipelineRow[]>({
    queryKey: ["component-build-pipeline"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("component_build_pipeline")
        .select("component_id, active_project_count, active_task_count");
      if (error) throw error;
      return data ?? [];
    },
  });

  const pipeMap = useMemo(() => {
    const m = new Map<string, PipelineRow>();
    pipeline.forEach((p) => m.set(p.component_id, p));
    return m;
  }, [pipeline]);

  const enriched = useMemo(() => {
    return rows.map((c) => ({ c, p: pipeMap.get(c.id) }));
  }, [rows, pipeMap]);

  const kindCounts = useMemo(() => {
    const counts: Record<ComponentKind, number> = { user: 0, platform: 0, internal: 0 };
    enriched.forEach(({ c }) => {
      const k = (c.component_kind ?? "user") as ComponentKind;
      if (k in counts) counts[k] += 1;
    });
    return counts;
  }, [enriched]);

  const filtered = useMemo(() => {
    const list = enriched.filter(({ c, p }) => {
      if ((c.component_kind ?? "user") !== kind) return false;
      if (domain !== ALL && !(c.related_domains ?? []).includes(domain)) return false;
      if (tenet !== ALL && !(c.related_tenets ?? []).includes(tenet)) return false;
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      const activity = (p?.active_project_count ?? 0) + (p?.active_task_count ?? 0);
      const stale = (Date.now() - new Date(c.updated_at).getTime()) / 86_400_000 > 30;
      if (mode === "active" && activity === 0) return false;
      if (mode === "stalled" && (activity > 0 || !stale)) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sort === "moved") {
        const av = (a.p?.active_project_count ?? 0) + (a.p?.active_task_count ?? 0);
        const bv = (b.p?.active_project_count ?? 0) + (b.p?.active_task_count ?? 0);
        if (bv !== av) return bv - av;
        return new Date(b.c.updated_at).getTime() - new Date(a.c.updated_at).getTime();
      }
      if (sort === "maturity") {
        return (
          (MATURITY_ORDER[b.c.current_maturity_level ?? ""] ?? 0) -
          (MATURITY_ORDER[a.c.current_maturity_level ?? ""] ?? 0)
        );
      }
      return a.c.name.localeCompare(b.c.name);
    });
    return list;
  }, [enriched, domain, tenet, q, mode, sort, kind]);

  const domainName = (slug: string) => domains.find((d) => d.slug === slug)?.name ?? slug;
  const activeCount = enriched.filter(
    ({ p }) => (p?.active_project_count ?? 0) + (p?.active_task_count ?? 0) > 0,
  ).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris/10 text-[color:var(--iris-violet)]">
          <Blocks className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Components</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} total · <span className="font-medium text-[color:var(--success-foreground)]">{activeCount} actively being built</span>
          </p>
        </div>
        <Link to="/components/$id" params={{ id: "new" }}>
          <Button size="sm">+ New component</Button>
        </Link>
      </div>

      <ComponentKindToggle value={kind} counts={kindCounts} onChange={setKind} />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3 w-3" /> Show
          </div>
          {(
            [
              { id: "all", label: "All" },
              { id: "active", label: `Active (${activeCount})` },
              { id: "stalled", label: "Stalled 30d+" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                mode === opt.id
                  ? "border-iris bg-iris-soft"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}

          <span className="ml-2 text-[11px] uppercase tracking-wider text-muted-foreground">Sort</span>
          {(
            [
              { id: "moved", label: "Most-moved" },
              { id: "maturity", label: "Maturity" },
              { id: "alpha", label: "A–Z" },
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

          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All domains</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.slug} value={d.slug}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tenet} onValueChange={setTenet}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue placeholder="Tenet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tenets</SelectItem>
              {(["Foundation", "Specialization", "Advanced", "Mastery"] as const).map((cat) => (
                <SelectGroup key={cat}>
                  <SelectLabel className="text-[10px] uppercase tracking-wider">{cat}</SelectLabel>
                  {TENETS_BY_CATEGORY[cat].map((t) => (
                    <SelectItem key={t.code} value={t.name}>
                      {t.code} · {t.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

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

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading components…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No components match these filters.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map(({ c, p }) => {
              const activeProjects = p?.active_project_count ?? 0;
              const activeTasks = p?.active_task_count ?? 0;
              const isActive = activeProjects + activeTasks > 0;
              return (
                <Link
                  key={c.id}
                  to="/components/$id"
                  params={{ id: c.id }}
                  className="block px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        {c.current_maturity_level && (
                          <Badge variant="secondary" className="h-4 text-[9px] uppercase tracking-wider">
                            {c.current_maturity_level}
                          </Badge>
                        )}
                        {c.quality_status && (
                          <Badge variant="outline" className="h-4 text-[9px]">
                            {c.quality_status}
                          </Badge>
                        )}
                        {isActive && (
                          <Badge className="h-4 bg-[color:var(--success)]/15 text-[9px] text-[color:var(--success-foreground)] hover:bg-[color:var(--success)]/20">
                            <Activity className="h-2.5 w-2.5" />
                            Active
                          </Badge>
                        )}
                      </div>
                      {c.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {c.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <RollupStatChip
                          label="projects"
                          value={activeProjects}
                          tone={activeProjects > 0 ? "iris" : "neutral"}
                        />
                        <RollupStatChip
                          label="tasks"
                          value={activeTasks}
                          tone={activeTasks > 0 ? "iris" : "neutral"}
                        />
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {formatDistanceToNow(parseISO(c.updated_at), { addSuffix: true })}
                        </span>
                        {(c.related_domains ?? []).map((d) => (
                          <span
                            key={`d-${d}`}
                            className="inline-flex items-center rounded-full border border-border bg-iris-soft px-1.5 py-0.5 text-[9px]"
                          >
                            {domainName(d)}
                          </span>
                        ))}
                        {(c.related_tenets ?? []).slice(0, 3).map((t) => (
                          <span
                            key={`t-${t}`}
                            className="inline-flex items-center rounded-full border border-[color:var(--success)]/30 bg-[color:var(--success)]/15 px-1.5 py-0.5 text-[9px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
