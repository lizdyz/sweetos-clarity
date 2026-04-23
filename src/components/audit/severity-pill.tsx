import { cn } from "@/lib/utils";
import type { AuditSeverity } from "@/lib/audit";

const STYLES: Record<AuditSeverity, string> = {
  info: "bg-muted text-muted-foreground",
  notice: "bg-iris-soft/60 text-[color:var(--iris-violet)]",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  error: "bg-red-500/15 text-red-700 dark:text-red-400",
  critical: "bg-red-600 text-white",
};

export function SeverityPill({ severity, className }: { severity: AuditSeverity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider",
        STYLES[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}
