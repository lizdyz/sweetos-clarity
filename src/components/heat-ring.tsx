import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type Heat = "neutral" | "amber" | "red";

/**
 * Computes heat from rollup numbers.
 * red = anything overdue · amber = blocked but not overdue · neutral otherwise.
 */
export function heatFromRollup({
  overdue = 0,
  blocked = 0,
}: {
  overdue?: number | null;
  blocked?: number | null;
}): Heat {
  if ((overdue ?? 0) > 0) return "red";
  if ((blocked ?? 0) > 0) return "amber";
  return "neutral";
}

const ringStyles: Record<Heat, string> = {
  neutral: "ring-1 ring-border/60",
  amber: "ring-2 ring-[color:var(--warning)]/50",
  red: "ring-2 ring-destructive/55",
};

export function HeatRing({
  heat = "neutral",
  className,
  children,
}: {
  heat?: Heat;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl transition-shadow", ringStyles[heat], className)}>
      {children}
    </div>
  );
}
