// URL-state hook for the UniversalFilterBar. Backed by TanStack search params
// via the zod adapter (uses `fallback()` not `.catch()` per docs).
//
// Use:
//   const Route = createFileRoute("/_app/sparks/")({
//     validateSearch: zodValidator(universalFilterSchema),
//     component: SparksIndex,
//   });
//
//   const { filters, setFilter } = useUniversalFilters();

import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { LensCode } from "@/components/framework-lens-switcher";

export const LENS_CODES = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"] as const;

export const universalFilterSchema = z.object({
  domain: fallback(z.string().optional(), undefined),
  tenet: fallback(z.string().optional(), undefined),
  p: fallback(
    z.enum(["Purpose", "People", "Process", "Product", "Profit"]).optional(),
    undefined,
  ),
  lens: fallback(z.enum(LENS_CODES).optional(), undefined),
  state: fallback(z.string().optional(), undefined),
  owner: fallback(z.string().optional(), undefined),
});

export type UniversalFilters = z.infer<typeof universalFilterSchema>;

export interface UniversalFilterValues {
  domain?: string;
  tenet?: string;
  p?: "Purpose" | "People" | "Process" | "Product" | "Profit";
  lens?: LensCode;
  state?: string;
  owner?: string;
}

/**
 * Read filters from any route that uses universalFilterSchema. We use
 * { strict: false } so this hook works on every page that opts in without
 * needing per-route type plumbing.
 */
export function useUniversalFilters(): {
  filters: UniversalFilterValues;
  setFilter: <K extends keyof UniversalFilterValues>(
    key: K,
    value: UniversalFilterValues[K] | undefined,
  ) => void;
  clear: () => void;
} {
  const search = useSearch({ strict: false }) as Partial<UniversalFilterValues>;
  const navigate = useNavigate();

  const filters: UniversalFilterValues = {
    domain: search.domain,
    tenet: search.tenet,
    p: search.p,
    lens: search.lens,
    state: search.state,
    owner: search.owner,
  };

  function setFilter<K extends keyof UniversalFilterValues>(
    key: K,
    value: UniversalFilterValues[K] | undefined,
  ) {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        if (value === undefined || value === null || value === "") {
          delete next[key];
        } else {
          next[key] = value;
        }
        return next;
      },
    });
  }

  function clear() {
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next.domain;
        delete next.tenet;
        delete next.p;
        delete next.lens;
        delete next.state;
        delete next.owner;
        return next;
      },
    });
  }

  return { filters, setFilter, clear };
}
