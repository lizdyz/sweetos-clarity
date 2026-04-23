// UniversalFilterBar — Domain · Tenet · Owner (single, searchable combobox)
// + 5P · Lens (F1–F8) · State (multi-select chip groups, always visible).
//
// Implements the form-control canon (`mem://design/form-controls.md`):
//   small enums => multi-select chips
//   large sets  => searchable combobox (Popover + Command)

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, HelpCircle, X } from "lucide-react";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  useUniversalFilters,
  FIVE_PS,
  LENS_CODES,
} from "@/lib/use-universal-filters";
import { LENS_DEFS, type LensCode } from "@/components/framework-lens-switcher";

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
  const { filters, setSingle, toggleMulti, clear, activeCount } = useUniversalFilters();

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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* === Searchable single-select comboboxes (large sets) === */}
      {show.includes("domain") && (
        <FilterCombobox
          label="Domain"
          value={filters.domain}
          options={domains.map((d) => ({ value: d.slug, label: d.name }))}
          onChange={(v) => setSingle("domain", v)}
        />
      )}
      {show.includes("tenet") && (
        <FilterCombobox
          label="Tenet"
          value={filters.tenet}
          options={tenets.map((t) => ({ value: t.slug, label: t.name }))}
          onChange={(v) => setSingle("tenet", v)}
        />
      )}
      {show.includes("owner") && (
        <FilterCombobox
          label="Owner"
          value={filters.owner}
          options={operators.map((o) => ({ value: o.id, label: o.name }))}
          onChange={(v) => setSingle("owner", v)}
        />
      )}

      {/* === Multi-select chip groups (small enums, always visible) === */}
      {show.includes("p") && (
        <ChipGroup
          label="5P"
          values={filters.p}
          options={FIVE_PS.map((p) => ({ value: p, label: p }))}
          onToggle={(v) => toggleMulti("p", v)}
        />
      )}
      {show.includes("lens") && (
        <ChipGroup
          label="Lens"
          values={filters.lens}
          options={LENS_CODES.map((c) => ({
            value: c,
            label: c,
            tooltip: LENS_DEFS[c as LensCode]?.name,
          }))}
          onToggle={(v) => toggleMulti("lens", v)}
        />
      )}
      {show.includes("state") && stateOptions.length > 0 && (
        <ChipGroup
          label="State"
          values={filters.state}
          options={stateOptions.map((s) => ({ value: s, label: s }))}
          onToggle={(v) => toggleMulti("state", v)}
        />
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
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="What do these filters mean?"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 text-xs leading-relaxed">
          <p className="mb-2 font-semibold">Universal filters</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Domain</span> — one of the 22
              universal business dimensions (single-select).
            </li>
            <li>
              <span className="font-medium text-foreground">Tenet</span> — industry-specific
              competency (single-select).
            </li>
            <li>
              <span className="font-medium text-foreground">Owner</span> — who's accountable
              (single-select).
            </li>
            <li>
              <span className="font-medium text-foreground">5P · Lens · State</span> —
              multi-select chips: combine to narrow.
            </li>
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ============================================================
   ChipGroup — multi-select, always-visible chip list.
   ============================================================ */
function ChipGroup({
  label,
  values,
  options,
  onToggle,
}: {
  label: string;
  values: string[];
  options: { value: string; label: string; tooltip?: string }[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface/60 p-0.5">
      <span className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {options.map((opt) => {
        const active = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            title={opt.tooltip}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
              active
                ? "bg-iris text-white shadow-[var(--shadow-glow)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   FilterCombobox — single-select searchable popover.
   ============================================================ */
function FilterCombobox({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== undefined;
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
          <span className="max-w-[10rem] truncate">{active ? current?.label ?? value : "any"}</span>
          {active ? (
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange(undefined);
              }}
            />
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-60" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
