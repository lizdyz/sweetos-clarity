import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduledChipProps {
  scheduledFor?: string | null;
  className?: string;
  showIcon?: boolean;
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysFromToday(iso: string): number {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function ScheduledChip({ scheduledFor, className, showIcon = true }: ScheduledChipProps) {
  if (!scheduledFor) return null;
  const days = daysFromToday(scheduledFor);
  let label = `Scheduled ${formatShort(scheduledFor)}`;
  if (days === 0) label = "Scheduled today";
  else if (days === 1) label = "Scheduled tomorrow";
  else if (days < 0) label = `Was scheduled ${Math.abs(days)}d ago`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400",
        className,
      )}
      title={scheduledFor}
    >
      {showIcon && <CalendarClock className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}
