import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { SeverityPill } from "./severity-pill";
import { EventCategoryChip } from "./event-category-chip";
import { AuditRowDetail } from "./audit-row-detail";
import type { AuditEventRow, AuditFilters } from "@/lib/audit";

interface Props {
  rows: AuditEventRow[];
  loading: boolean;
  onApplyFilter: (patch: Partial<AuditFilters>) => void;
}

export function AuditResultsTable({ rows, loading, onApplyFilter }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        No events match these filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="w-6"></th>
            <th className="px-2 py-2 text-left">Time</th>
            <th className="px-2 py-2 text-left">Actor</th>
            <th className="px-2 py-2 text-left">Category</th>
            <th className="px-2 py-2 text-left">Sev</th>
            <th className="px-2 py-2 text-left">Subject</th>
            <th className="px-2 py-2 text-left">Field · Change</th>
            <th className="px-2 py-2 text-left">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const open = expanded.has(r.id);
            return (
              <Fragment key={r.id}>
                <tr
                  className={cn(
                    "cursor-pointer border-b border-border/40 hover:bg-muted/30",
                    open && "bg-muted/40",
                  )}
                  onClick={() => toggle(r.id)}
                >
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </td>
                  <td className="px-2 py-1.5" title={new Date(r.created_at).toLocaleString()}>
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (r.created_by) onApplyFilter({ actor_id: r.created_by });
                      }}
                      className="hover:underline"
                    >
                      {r.actor_display_name || r.created_by?.slice(0, 8) || "system"}
                    </button>
                  </td>
                  <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <EventCategoryChip
                      category={r.event_category}
                      onClick={() => onApplyFilter({ categories: [r.event_category] })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <SeverityPill severity={r.severity} />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyFilter({ subject_id: r.subject_id, subject_kinds: [r.subject_kind] });
                      }}
                      className="text-left hover:underline"
                    >
                      <span className="rounded bg-muted px-1 font-mono text-[10px]">{r.subject_kind}</span>{" "}
                      <span className="truncate">{r.subject_label || r.subject_id.slice(0, 8)}</span>
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    {r.field ? (
                      <span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplyFilter({ field: r.field });
                          }}
                          className="font-mono text-[10px] hover:underline"
                        >
                          {r.field}
                        </button>{" "}
                        <span className="text-muted-foreground">{r.change_type}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{r.change_type}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.source}</td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <AuditRowDetail row={r} onApplyFilter={onApplyFilter} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
