// Visual stepper for the Planning Workspace. Pure UI, no data dependencies.
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanningStep {
  key: string;
  label: string;
  hint: string;
}

interface Props {
  steps: PlanningStep[];
  current: string;
  onSelect: (key: string) => void;
  /** Steps the user has visited at least once — shown with a check. */
  visited: Set<string>;
}

export function PlanningStepper({ steps, current, onSelect, visited }: Props) {
  return (
    <ol className="flex w-full flex-wrap items-stretch gap-2 rounded-2xl border border-border bg-surface/60 p-2">
      {steps.map((step, idx) => {
        const isActive = step.key === current;
        const isDone = visited.has(step.key) && !isActive;
        return (
          <li key={step.key} className="flex-1 min-w-[140px]">
            <button
              type="button"
              onClick={() => onSelect(step.key)}
              className={cn(
                "group flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition-all",
                isActive
                  ? "border-[color:var(--iris-violet)]/60 bg-iris-soft/50 shadow-[var(--shadow-glow)]"
                  : "border-border/60 bg-background/60 hover:bg-iris-soft/30",
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                  isActive
                    ? "bg-iris text-white"
                    : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : idx + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{step.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {step.hint}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
