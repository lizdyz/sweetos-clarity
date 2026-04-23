import { AlertTriangle, Activity, Users } from "lucide-react";
import type { AuditEventRow } from "@/lib/audit";

interface Props {
  rows: AuditEventRow[];
  total: number;
}

export function AuditSummaryStrip({ rows, total }: Props) {
  const actors = new Set(rows.map((r) => r.created_by).filter(Boolean));
  const warnings = rows.filter((r) => r.severity === "warning" || r.severity === "error" || r.severity === "critical").length;

  return (
    <div className="flex items-center gap-4 border-b border-border bg-surface/40 px-4 py-2 text-xs">
      <span className="inline-flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <strong>{total.toLocaleString()}</strong> <span className="text-muted-foreground">events</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <strong>{actors.size}</strong> <span className="text-muted-foreground">actors</span>
      </span>
      {warnings > 0 && (
        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <strong>{warnings}</strong> <span>severity ≥ warning in view</span>
        </span>
      )}
    </div>
  );
}
