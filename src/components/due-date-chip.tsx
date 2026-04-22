import { Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DueDateChipProps {
  due?: string | null;
  doneAt?: string | null;
  className?: string;
  showIcon?: boolean;
}

function daysFromToday(iso: string): number {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DueDateChip({ due, doneAt, className, showIcon = true }: DueDateChipProps) {
  if (doneAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400",
          className,
        )}
      >
        {showIcon && <CheckCircle2 className="h-2.5 w-2.5" />}
        Done {formatShort(doneAt)}
      </span>
    );
  }

  if (!due) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground",
          className,
        )}
      >
        {showIcon && <Calendar className="h-2.5 w-2.5" />}
        No due date
      </span>
    );
  }

  const days = daysFromToday(due);
  let tone = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  let label = `Due ${formatShort(due)}`;
  if (days < 0) {
    tone = "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    label = `Overdue ${Math.abs(days)}d`;
  } else if (days === 0) {
    tone = "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    label = "Due today";
  } else if (days <= 7) {
    tone = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    label = `Due in ${days}d`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        tone,
        className,
      )}
      title={due}
    >
      {showIcon && <Calendar className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}
