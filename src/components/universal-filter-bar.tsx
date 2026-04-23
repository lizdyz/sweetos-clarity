// UniversalFilterBar — Domain · Tenet · 5P · Lens · State · Owner.
// Single component mounted on every list page. State lives in URL search
// params via useUniversalFilters. The Lens dropdown is the same component
// used by FrameworkLensSwitcher (canon: F1–F8 view layers).

import { useQuery } from "@tanstack/react-query";
import { HelpCircle, X } from "lucide-react";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useUniversalFilters } from "@/lib/use-universal-filters";
import { LENS_DEFS, type LensCode } from "@/components/framework-lens-switcher";

const FIVE_PS = ["Purpose", "People", "Process", "Product", "Profit"] as const;

interface UniversalFilterBarProps {
  /** Which filters apply on this page. Defaults to all. */
  show?: Array<"domain" | "tenet" | "p" | "lens" | "state" | "owner">;
  /** Available state values for the current entity (e.g. ["raw","framed","routed"]) */
  stateOptions?: string[];
  className?: string;
}

export function UniversalFilterBar({
  show = ["domain", "tenet", "p", "lens", "state", "owner"],
  stateOptions = [],
  className,
}: UniversalFilterBarProps) {
  const { filters, setFilter, clear } = useUniversalFilters();
  const activeCount = Object.values(filters).filter((v) => v !== undefined).length;

  const { data: domains = [] } = useQuery({
    queryKey: ["filter-bar", "domains"],
    queryFn: async () => {
      const { data } = await sb
        .from("domains")
        .select("id, name, slug")
        .eq("enabled", true)
        .order("sort_order");
      return (data ?? []) as { id: string; name: string; slug: string }[];
    },
    enabled: show.includes("domain"),
  });

  const { data: tenets = [] } = useQuery({
    queryKey: ["filter-bar", "tenets"],
    queryFn: async () => {
      const { data } = await sb.from("tenets").select("id, name, slug").order("name");
      return (data ?? []) as { id: string; name: string; slug: string }[];
    },
    enabled: show.includes("tenet"),
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["filter-bar", "operators"],
    queryFn: async () => {
      const { data } = await sb.from("operators").select("id, name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: show.includes("owner"),
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {show.includes("domain") && (
        <FilterDropdown
          label="Domain"
          value={filters.domain}
          onClear={() => setFilter("domain", undefined)}
          renderLabel={(v) => domains.find((d) => d.slug === v)?.name ?? v}
        >
          {domains.map((d) => (
            <DropdownMenuItem key={d.id} onClick={() => setFilter("domain", d.slug)}>
              {d.name}
            </DropdownMenuItem>
          ))}
        </FilterDropdown>
      )}

      {show.includes("tenet") && (
        <FilterDropdown
          label="Tenet"
          value={filters.tenet}
          onClear={() => setFilter("tenet", undefined)}
          renderLabel={(v) => tenets.find((t) => t.slug === v)?.name ?? v}
        >
          {tenets.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => setFilter("tenet", t.slug)}>
              {t.name}
            </DropdownMenuItem>
          ))}
        </FilterDropdown>
      )}

      {show.includes("p") && (
        <FilterDropdown
          label="5P"
          value={filters.p}
          onClear={() => setFilter("p", undefined)}
          renderLabel={(v) => v}
        >
          {FIVE_PS.map((p) => (
            <DropdownMenuItem key={p} onClick={() => setFilter("p", p)}>
              {p}
            </DropdownMenuItem>
          ))}
        </FilterDropdown>
      )}

      {show.includes("lens") && (
        <FilterDropdown
          label="Lens"
          value={filters.lens}
          onClear={() => setFilter("lens", undefined)}
          renderLabel={(v) => `${v} ${LENS_DEFS[v as LensCode]?.name ?? ""}`.trim()}
        >
          <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Framework lenses
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.values(LENS_DEFS).map((l) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => setFilter("lens", l.code)}
              className="flex flex-col items-start"
            >
              <span className="text-xs font-medium">
                {l.code} {l.name}
              </span>
              <span className="text-[10px] text-muted-foreground">{l.tagline}</span>
            </DropdownMenuItem>
          ))}
        </FilterDropdown>
      )}

      {show.includes("state") && stateOptions.length > 0 && (
        <FilterDropdown
          label="State"
          value={filters.state}
          onClear={() => setFilter("state", undefined)}
          renderLabel={(v) => v}
        >
          {stateOptions.map((s) => (
            <DropdownMenuItem key={s} onClick={() => setFilter("state", s)}>
              {s}
            </DropdownMenuItem>
          ))}
        </FilterDropdown>
      )}

      {show.includes("owner") && (
        <FilterDropdown
          label="Owner"
          value={filters.owner}
          onClear={() => setFilter("owner", undefined)}
          renderLabel={(v) => operators.find((o) => o.id === v)?.name ?? v}
        >
          {operators.map((o) => (
            <DropdownMenuItem key={o.id} onClick={() => setFilter("owner", o.id)}>
              {o.name}
            </DropdownMenuItem>
          ))}
        </FilterDropdown>
      )}

      {activeCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={clear}
          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear ({activeCount})
        </Button>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="What do these filters mean?">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 text-xs leading-relaxed">
          <p className="mb-2 font-semibold">Universal filters</p>
          <ul className="space-y-1 text-muted-foreground">
            <li><span className="font-medium text-foreground">Domain</span> — one of the 22 universal business dimensions.</li>
            <li><span className="font-medium text-foreground">Tenet</span> — industry-specific competency.</li>
            <li><span className="font-medium text-foreground">5P</span> — Purpose / People / Process / Product / Profit.</li>
            <li><span className="font-medium text-foreground">Lens (F1–F8)</span> — re-projects rows under a framework's stages. View only.</li>
            <li><span className="font-medium text-foreground">State</span> — entity-specific lifecycle.</li>
            <li><span className="font-medium text-foreground">Owner</span> — who's accountable.</li>
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  onClear,
  renderLabel,
  children,
}: {
  label: string;
  value: string | undefined;
  onClear: () => void;
  renderLabel: (v: string) => string;
  children: React.ReactNode;
}) {
  const active = value !== undefined;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
            active
              ? "border-iris bg-iris-soft text-iris"
              : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="text-muted-foreground/70">{label}:</span>
          <span>{active ? renderLabel(value!) : "any"}</span>
          {active && (
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClear();
              }}
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-auto">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
