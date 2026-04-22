import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "amber" | "red" | "iris" | "success" | "muted";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  amber:
    "bg-[color:var(--warning)]/15 text-[color:var(--warning-foreground)] border-[color:var(--warning)]/30",
  red: "bg-destructive/10 text-destructive border-destructive/30",
  iris: "bg-iris-soft text-foreground border-border-strong",
  success:
    "bg-[color:var(--success)]/15 text-[color:var(--success-foreground)] border-[color:var(--success)]/30",
  muted: "bg-muted text-muted-foreground border-border",
};

/**
 * Compact numeric chip used on rollup-driven index pages
 * (`/projects`, `/relationships`, `/tasks`, `/components`).
 *
 * Pattern: `<RollupStatChip label="overdue" value={3} tone="red" />`
 */
export function RollupStatChip({
  label,
  value,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value: number | string;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  if (value === 0 || value === "0") tone = "muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4 whitespace-nowrap",
        toneStyles[tone],
        className,
      )}
      title={`${label}: ${value}`}
    >
      {icon}
      <span className="tabular-nums font-semibold">{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}
