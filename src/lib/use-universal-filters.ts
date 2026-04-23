// URL-state hook for the UniversalFilterBar. Backed by TanStack search params
// via the zod adapter (uses `fallback()` not `.catch()` per docs).
//
// Form-control canon (`mem://design/form-controls.md`):
//  - Small enums (5P, Lens F1–F8, State) are MULTI-SELECT chip groups.
//  - Large sets (Domain, Tenet, Owner) are single-value searchable dropdowns.
//
// Multi-value filters are encoded as comma-separated strings in the URL so the
// search param remains a primitive (TanStack search params are stringified for
// the URL but parsed objects in JS — keeping them flat avoids surprises).

import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { LensCode } from "@/components/framework-lens-switcher";

export const LENS_CODES = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"] as const;
export const FIVE_PS = ["Purpose", "People", "Process", "Product", "Profit"] as const;

// Multi-value fields are stored as `a,b,c` strings; the hook hydrates them
// to `string[]` for consumers.
const csv = z.string().optional();

export const universalFilterSchema = z.object({
  // single-value (combobox / dropdown)
  domain: fallback(z.string().optional(), undefined),
  tenet: fallback(z.string().optional(), undefined),
  owner: fallback(z.string().optional(), undefined),
  // multi-value (chip groups), stored as CSV in the URL
  p: fallback(csv, undefined),
  lens: fallback(csv, undefined),
  state: fallback(csv, undefined),
});

export type UniversalFiltersUrl = z.infer<typeof universalFilterSchema>;

export interface UniversalFilterValues {
  domain?: string;
  tenet?: string;
  owner?: string;
  p: Array<(typeof FIVE_PS)[number]>;
  lens: LensCode[];
  state: string[];
}

const FIVE_P_SET = new Set<string>(FIVE_PS);
const LENS_SET = new Set<string>(LENS_CODES);

function parseCsv<T extends string>(raw: string | undefined, allow?: Set<string>): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && (!allow || allow.has(s))) as T[];
}

function toCsv(values: string[]): string | undefined {
  if (!values || values.length === 0) return undefined;
  return values.join(",");
}

/**
 * Read filters from any route that uses universalFilterSchema. Uses
 * { strict: false } so the hook works on every page that opts in without
 * needing per-route type plumbing.
 */
export function useUniversalFilters(): {
  filters: UniversalFilterValues;
  setSingle: (key: "domain" | "tenet" | "owner", value: string | undefined) => void;
  toggleMulti: (key: "p" | "lens" | "state", value: string) => void;
  setMulti: (key: "p" | "lens" | "state", values: string[]) => void;
  clear: () => void;
  activeCount: number;
} {
  const search = useSearch({ strict: false }) as Partial<UniversalFiltersUrl>;
  const navigate = useNavigate();

  const filters: UniversalFilterValues = {
    domain: search.domain,
    tenet: search.tenet,
    owner: search.owner,
    p: parseCsv<(typeof FIVE_PS)[number]>(search.p, FIVE_P_SET),
    lens: parseCsv<LensCode>(search.lens, LENS_SET),
    state: parseCsv<string>(search.state),
  };

  const activeCount =
    (filters.domain ? 1 : 0) +
    (filters.tenet ? 1 : 0) +
    (filters.owner ? 1 : 0) +
    filters.p.length +
    filters.lens.length +
    filters.state.length;

  function setSingle(key: "domain" | "tenet" | "owner", value: string | undefined) {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        if (!value) delete next[key];
        else next[key] = value;
        return next;
      },
    });
  }

  function setMulti(key: "p" | "lens" | "state", values: string[]) {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        const csvVal = toCsv(values);
        if (!csvVal) delete next[key];
        else next[key] = csvVal;
        return next;
      },
    });
  }

  function toggleMulti(key: "p" | "lens" | "state", value: string) {
    const current = filters[key] as string[];
    const exists = current.includes(value);
    const nextValues = exists ? current.filter((v) => v !== value) : [...current, value];
    setMulti(key, nextValues);
  }

  function clear() {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        for (const k of ["domain", "tenet", "owner", "p", "lens", "state"]) {
          delete next[k];
        }
        return next;
      },
    });
  }

  return { filters, setSingle, toggleMulti, setMulti, clear, activeCount };
}
