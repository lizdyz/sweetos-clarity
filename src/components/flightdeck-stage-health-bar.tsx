import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const STAGES = [
  "Awareness",
  "Pre-Engagement",
  "Mirror",
  "Map",
  "Machine",
  "Sync",
] as const;

type Stage = (typeof STAGES)[number];

interface StageRow {
  stage: Stage;
  count: number;
  stalled: number;
}

interface Props {
  rows: StageRow[];
  selected: Stage | "All";
  onSelect: (next: Stage | "All") => void;
}

/**
 * Sticky one-line summary of pipeline stage counts above the Flightdeck swimlanes.
 * Click a segment to filter the swimlanes to just that stage.
 */
export function FlightdeckStageHealthBar({ rows, selected, onSelect }: Props) {
  const total = rows.reduce((acc, r) => acc + r.count, 0);
  return (
    <div className="sticky top-0 z-10 -mx-1 mb-2 rounded-xl border border-border/60 bg-background/90 p-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelect("All")}
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            selected === "All"
              ? "bg-iris text-white"
              : "border border-border/60 bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          All · {total}
        </button>
        <span className="text-[10px] text-muted-foreground/60">|</span>
        {rows.map((r) => {
          const active = selected === r.stage;
          return (
            <button
              key={r.stage}
              type="button"
              onClick={() => onSelect(r.stage)}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors",
                active
                  ? "bg-iris text-white"
                  : "border border-border/60 bg-background text-muted-foreground hover:text-foreground",
              )}
              title={
                r.stalled > 0
                  ? `${r.count} in ${r.stage} · ${r.stalled} stalled >30d`
                  : `${r.count} in ${r.stage}`
              }
            >
              <span className="font-medium">{r.stage}</span>
              <span className={cn("tabular-nums", active ? "text-white/90" : "text-foreground/80")}>
                {r.count}
              </span>
              {r.stalled > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-sm px-1 text-[9px] font-semibold",
                    active ? "bg-white/20 text-white" : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                  )}
                >
                  <AlertTriangle className="h-2.5 w-2.5" /> {r.stalled}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { Stage as PipelineStage };
export { STAGES as PIPELINE_STAGES };
