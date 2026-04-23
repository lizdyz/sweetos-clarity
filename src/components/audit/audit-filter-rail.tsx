import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  AUDIT_SOURCES,
  CATEGORY_LABEL,
  type AuditFilters,
} from "@/lib/audit";
import { listAuditActors } from "@/utils/audit.functions";

const SUBJECT_KINDS = [
  "components",
  "journeys",
  "quests",
  "missions",
  "tasks",
  "projects",
  "decisions",
  "sessions",
  "workflows",
  "operators",
  "relationships",
  "engagement_plans",
  "sparks",
];

interface Props {
  filters: AuditFilters;
  onChange: (next: AuditFilters) => void;
  onReset: () => void;
}

export function AuditFilterRail({ filters, onChange, onReset }: Props) {
  const [search, setSearch] = useState(filters.search ?? "");
  const listActorsFn = useServerFn(listAuditActors);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (filters.search ?? "")) {
        onChange({ ...filters, search: search || null });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data: actorsData } = useQuery({
    queryKey: ["audit-actors"],
    queryFn: () => listActorsFn(),
  });
  const actors = (actorsData?.actors ?? []) as { id: string; display_name: string | null }[];

  function toggleArray<T extends string>(key: keyof AuditFilters, value: T) {
    const current = (filters[key] as T[] | undefined) ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  }

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-surface/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Filters
        </h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-6 text-[10px]">
          Reset
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date range</Label>
        <Select
          value={filters.date_range ?? "7d"}
          onValueChange={(v) => onChange({ ...filters, date_range: v as AuditFilters["date_range"] })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Notes, subject, field…"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <FilterGroup label="Severity">
        {AUDIT_SEVERITIES.map((s) => (
          <CheckRow
            key={s}
            label={s}
            checked={filters.severities?.includes(s) ?? false}
            onChange={() => toggleArray("severities", s)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Event category">
        {AUDIT_CATEGORIES.map((c) => (
          <CheckRow
            key={c}
            label={CATEGORY_LABEL[c]}
            checked={filters.categories?.includes(c) ?? false}
            onChange={() => toggleArray("categories", c)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Source">
        {AUDIT_SOURCES.map((s) => (
          <CheckRow
            key={s}
            label={s}
            checked={filters.sources?.includes(s) ?? false}
            onChange={() => toggleArray("sources", s)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Subject kind">
        {SUBJECT_KINDS.map((k) => (
          <CheckRow
            key={k}
            label={k}
            checked={filters.subject_kinds?.includes(k) ?? false}
            onChange={() => toggleArray("subject_kinds", k)}
          />
        ))}
      </FilterGroup>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Actor</Label>
        <Select
          value={filters.actor_id ?? "all"}
          onValueChange={(v) => onChange({ ...filters, actor_id: v === "all" ? null : v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Any actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any actor</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.display_name || a.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(filters.subject_id || filters.source_run_id || filters.request_id || filters.field) && (
        <div className="space-y-1.5 rounded-md border border-iris/20 bg-iris-soft/20 p-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Active scopes
          </Label>
          {filters.subject_id && (
            <ScopeChip
              label={`subject: ${filters.subject_id.slice(0, 8)}…`}
              onClear={() => onChange({ ...filters, subject_id: null })}
            />
          )}
          {filters.source_run_id && (
            <ScopeChip
              label={`run: ${filters.source_run_id.slice(0, 8)}…`}
              onClear={() => onChange({ ...filters, source_run_id: null, source_run_kind: null })}
            />
          )}
          {filters.request_id && (
            <ScopeChip
              label={`req: ${filters.request_id.slice(0, 12)}…`}
              onClear={() => onChange({ ...filters, request_id: null })}
            />
          )}
          {filters.field && (
            <ScopeChip
              label={`field: ${filters.field}`}
              onClear={() => onChange({ ...filters, field: null })}
            />
          )}
        </div>
      )}
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-xs hover:bg-muted/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3 w-3 rounded border-border"
      />
      <span className="capitalize">{label}</span>
    </label>
  );
}

function ScopeChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-1 rounded bg-background px-1.5 py-0.5 text-[10px]">
      <span className="font-mono">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Clear scope"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
