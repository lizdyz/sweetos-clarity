import { useMemo, useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * F1–F8 Framework Lens overlay (canon: mem://design/lenses-bizzybots.md).
 *
 * View-only projection — does not mutate data. Given a set of rows and a
 * resolver per lens that returns the stage label for each row, this groups
 * rows under the chosen lens's stages.
 */

export type LensCode = "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8";

export const LENS_DEFS: Record<
  LensCode,
  { code: LensCode; name: string; stages: string[]; tagline: string }
> = {
  F1: {
    code: "F1",
    name: "OCDA",
    stages: ["Observe", "Choose", "Decide", "Act"],
    tagline: "Personal decision rhythm",
  },
  F2: {
    code: "F2",
    name: "Gestalt",
    stages: ["Past", "Present", "Future"],
    tagline: "Time orientation",
  },
  F3: {
    code: "F3",
    name: "4Ds",
    stages: ["Discover", "Define", "Develop", "Deliver"],
    tagline: "Build cycle",
  },
  F4: {
    code: "F4",
    name: "5Ps",
    stages: ["Purpose", "People", "Process", "Product", "Profit"],
    tagline: "Diagnostic axes",
  },
  F5: {
    code: "F5",
    name: "3Cs",
    stages: ["Consent", "Control", "Collaboration"],
    tagline: "Engagement posture",
  },
  F6: {
    code: "F6",
    name: "5Ls",
    stages: ["Lacking", "Learning", "Launching", "Leveraging", "Leading"],
    tagline: "Maturity ladder",
  },
  F7: {
    code: "F7",
    name: "Co-Evolution",
    stages: ["Explore", "Exploit", "Attune", "Integrate", "Recalibrate"],
    tagline: "Discovery vs use",
  },
  F8: {
    code: "F8",
    name: "Rhetorical",
    stages: ["Ethos", "Pathos", "Kairos", "Logos"],
    tagline: "Argument shape",
  },
};

export const UNMAPPED = "Unmapped";

interface SwitcherProps {
  value: LensCode;
  onChange: (v: LensCode) => void;
  className?: string;
}

export function FrameworkLensSwitcher({ value, onChange, className }: SwitcherProps) {
  const def = LENS_DEFS[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted",
            className,
          )}
          title="Framework Lens — re-groups rows under a different framework's stages"
        >
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Lens:</span>
          <span>
            {def.code} {def.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Framework lenses
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.values(LENS_DEFS).map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => onChange(l.code)}
            className={cn("flex flex-col items-start gap-0.5", value === l.code && "bg-muted")}
          >
            <span className="text-xs font-medium">
              {l.code} {l.name}
            </span>
            <span className="text-[10px] text-muted-foreground">{l.tagline}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Group an array of rows by lens stage. `resolveStage` returns the stage
 * label (must match one of LENS_DEFS[lens].stages) or null/undefined for
 * unmapped rows. Empty stages are still rendered so user sees the full lens.
 */
export function useLensGrouping<T>(
  rows: T[],
  lens: LensCode,
  resolveStage: (row: T, lens: LensCode) => string | null | undefined,
): { stage: string; rows: T[] }[] {
  return useMemo(() => {
    const def = LENS_DEFS[lens];
    const buckets: Record<string, T[]> = {};
    for (const stage of def.stages) buckets[stage] = [];
    buckets[UNMAPPED] = [];
    for (const row of rows) {
      const stage = resolveStage(row, lens);
      if (stage && buckets[stage]) buckets[stage].push(row);
      else buckets[UNMAPPED].push(row);
    }
    const ordered = def.stages.map((s) => ({ stage: s, rows: buckets[s] }));
    if (buckets[UNMAPPED].length > 0) ordered.push({ stage: UNMAPPED, rows: buckets[UNMAPPED] });
    return ordered;
  }, [rows, lens, resolveStage]);
}

interface BoardProps<T> {
  rows: T[];
  lens: LensCode;
  resolveStage: (row: T, lens: LensCode) => string | null | undefined;
  renderRow: (row: T) => React.ReactNode;
  rowKey: (row: T) => string;
  emptyHint?: string;
}

export function FrameworkLensBoard<T>({
  rows,
  lens,
  resolveStage,
  renderRow,
  rowKey,
  emptyHint = "No rows in this stage yet.",
}: BoardProps<T>) {
  const groups = useLensGrouping(rows, lens, resolveStage);
  const def = LENS_DEFS[lens];
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Viewing through <span className="font-medium text-foreground">{def.code} {def.name}</span> — same rows, re-grouped under {def.stages.length} stages. {def.tagline}.
      </p>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${groups.length}, minmax(180px, 1fr))`,
        }}
      >
        {groups.map((g) => (
          <div
            key={g.stage}
            className="rounded-xl border border-border bg-surface/40 p-3"
          >
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.12em]",
                g.stage === UNMAPPED ? "text-muted-foreground/70" : "text-foreground",
              )}>
                {g.stage}
              </h3>
              <span className="text-[10px] text-muted-foreground">{g.rows.length}</span>
            </div>
            <ul className="space-y-1.5">
              {g.rows.length === 0 ? (
                <li className="text-[10px] italic text-muted-foreground/60">{emptyHint}</li>
              ) : (
                g.rows.map((r) => <li key={rowKey(r)}>{renderRow(r)}</li>)
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Convenience hook + default resolvers for common entities ---------- */

export function useLensState(initial: LensCode = "F1") {
  return useState<LensCode>(initial);
}

/** Default resolver for rows that carry framework-style tag fields. */
type LensTaggedRow = {
  ocda_stage?: string | null;
  gestalt_phase?: string | null;
  fourds_stage?: string | null;
  primary_p?: string | null; // 5Ps
  three_cs?: string | null;
  current_maturity_level?: string | null;
  coevolution_mode?: string | null;
  rhetorical_appeal?: string | null;
};

export function defaultLensResolver(row: LensTaggedRow, lens: LensCode): string | null {
  switch (lens) {
    case "F1":
      return normalizeOcda(row.ocda_stage);
    case "F2":
      return capitalize(row.gestalt_phase);
    case "F3":
      return capitalize(row.fourds_stage);
    case "F4":
      return normalize5p(row.primary_p);
    case "F5":
      return capitalize(row.three_cs);
    case "F6":
      return normalize5l(row.current_maturity_level);
    case "F7":
      return capitalize(row.coevolution_mode);
    case "F8":
      return capitalize(row.rhetorical_appeal);
    default:
      return null;
  }
}

function capitalize(v?: string | null): string | null {
  if (!v) return null;
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function normalizeOcda(v?: string | null): string | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.startsWith("obs")) return "Observe";
  if (s.startsWith("cho")) return "Choose";
  if (s.startsWith("dec")) return "Decide";
  if (s.startsWith("act")) return "Act";
  return null;
}

function normalize5p(v?: string | null): string | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.startsWith("pur") || s === "p1") return "Purpose";
  if (s.startsWith("peo") || s === "p2") return "People";
  if (s.startsWith("pro") && !s.startsWith("prod") && !s.startsWith("prof")) return "Process";
  if (s === "p3") return "Process";
  if (s.startsWith("prod") || s === "p4") return "Product";
  if (s.startsWith("prof") || s === "p5") return "Profit";
  return null;
}

function normalize5l(v?: string | null): string | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes("lacking")) return "Lacking";
  if (s.includes("learning")) return "Learning";
  if (s.includes("launching")) return "Launching";
  if (s.includes("leveraging")) return "Leveraging";
  if (s.includes("leading")) return "Leading";
  return null;
}
