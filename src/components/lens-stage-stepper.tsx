import { cn } from "@/lib/utils";
import type { LensStageBreakdown } from "@/lib/lens-types";

interface Props {
  stages: LensStageBreakdown[];
  activeIndex: number;
  onChange: (i: number) => void;
  accent: string;
}

export function LensStageStepper({ stages, activeIndex, onChange, accent }: Props) {
  if (!stages.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border/40 bg-card/40 px-4 py-2">
      {stages.map((s, i) => {
        const active = i === activeIndex;
        return (
          <div key={s.stage + i} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange(i)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all",
                active ? "shadow-sm" : "opacity-60 hover:opacity-100",
              )}
              style={{
                background: active
                  ? `color-mix(in oklab, ${accent} 22%, transparent)`
                  : "transparent",
                color: active ? accent : "var(--muted-foreground)",
                border: `1px solid color-mix(in oklab, ${accent} ${active ? 40 : 20}%, transparent)`,
              }}
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ background: active ? accent : `color-mix(in oklab, ${accent} 35%, transparent)` }}
              />
              {s.stage}
            </button>
            {i < stages.length - 1 && (
              <span className="text-[10px] text-muted-foreground/60">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
