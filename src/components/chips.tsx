import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "iris" | "success" | "warning" | "destructive" | "muted";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  iris: "bg-iris-soft text-foreground border-border-strong",
  success: "bg-[color:var(--success)]/15 text-[color:var(--success-foreground)] border-[color:var(--success)]/30",
  warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning-foreground)] border-[color:var(--warning)]/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 whitespace-nowrap",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const CONFIDENCE_TONE: Record<string, Tone> = {
  "Not Yet Verified": "muted",
  Inferred: "warning",
  Observed: "neutral",
  Verified: "success",
  Confirmed: "iris",
};

export function ConfidenceChip({ value }: { value?: string | null }) {
  if (!value) return null;
  return <Chip tone={CONFIDENCE_TONE[value] ?? "neutral"}>{value}</Chip>;
}

const PROGRESSION_TONE: Record<string, Tone> = {
  "Not Started": "muted",
  Open: "neutral",
  "Pre-filled": "warning",
  "Provisionally Satisfied": "warning",
  "Completed by you": "iris",
  "Completed with Liz": "iris",
  "Completed for you": "iris",
  "Confirmed Complete": "success",
  Skipped: "muted",
  Reopened: "warning",
  Superseded: "muted",
};

export function ProgressionChip({ value }: { value?: string | null }) {
  if (!value) return null;
  return <Chip tone={PROGRESSION_TONE[value] ?? "neutral"}>{value}</Chip>;
}

export function SourceChip({ value }: { value?: string | null }) {
  if (!value) return null;
  return <Chip tone="neutral">{value}</Chip>;
}

const STATE_TONE: Record<string, Tone> = {
  Identified: "muted",
  Defined: "neutral",
  Designed: "iris",
  Built: "iris",
  Delivered: "success",
  Adopted: "success",
  Sustained: "success",
};

export function StateChip({ value }: { value?: string | null }) {
  if (!value) return null;
  return <Chip tone={STATE_TONE[value] ?? "neutral"}>{value}</Chip>;
}
