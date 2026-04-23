import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AuditEventRow, AuditFilters } from "@/lib/audit";

interface Props {
  row: AuditEventRow;
  onApplyFilter: (patch: Partial<AuditFilters>) => void;
}

function pretty(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditRowDetail({ row, onApplyFilter }: Props) {
  function copyEvidence() {
    const md = [
      `**Audit event** — ${new Date(row.created_at).toISOString()}`,
      `- Subject: \`${row.subject_kind}\` / \`${row.subject_id}\`${row.subject_label ? ` (${row.subject_label})` : ""}`,
      `- Category: ${row.event_category} · Severity: ${row.severity} · Source: ${row.source}`,
      row.actor_display_name ? `- Actor: ${row.actor_display_name}` : null,
      row.field ? `- Field: \`${row.field}\`` : null,
      row.field ? `- Old: \`${pretty(row.old_value).slice(0, 200)}\`` : null,
      row.field ? `- New: \`${pretty(row.new_value).slice(0, 200)}\`` : null,
      row.notes ? `- Notes: ${row.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(md);
    toast.success("Evidence copied as markdown");
  }

  return (
    <div className="space-y-3 border-t border-border/40 bg-surface/40 p-4 text-xs">
      {/* Change diff */}
      {row.field ? (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Change · <span className="font-mono normal-case">{row.field}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Old</div>
              <pre className="max-h-48 overflow-auto rounded-md border border-red-500/20 bg-red-500/5 p-2 text-[11px]">
                {pretty(row.old_value)}
              </pre>
            </div>
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">New</div>
              <pre className="max-h-48 overflow-auto rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px]">
                {pretty(row.new_value)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      {!row.field && (row.old_value != null || row.new_value != null) ? (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Snapshot
          </div>
          <pre className="max-h-64 overflow-auto rounded-md border border-border/40 bg-background p-2 text-[11px]">
            {pretty(row.new_value ?? row.old_value)}
          </pre>
        </div>
      ) : null}

      {row.diff != null && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Diff
          </div>
          <pre className="max-h-48 overflow-auto rounded-md border border-border/40 bg-background p-2 text-[11px]">
            {pretty(row.diff)}
          </pre>
        </div>
      )}

      {/* Context */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Actor
          </div>
          <div>{row.actor_display_name || row.created_by?.slice(0, 8) || "system"}</div>
          {row.ip_address && <div className="font-mono text-[10px] text-muted-foreground">{row.ip_address}</div>}
          {row.user_agent && (
            <div className="truncate text-[10px] text-muted-foreground" title={row.user_agent}>
              {row.user_agent}
            </div>
          )}
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Subject
          </div>
          <div>
            <span className="rounded bg-muted px-1 font-mono text-[10px]">{row.subject_kind}</span>{" "}
            {row.subject_label && <span>{row.subject_label}</span>}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(row.subject_id);
              toast.success("ID copied");
            }}
            className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-2.5 w-2.5" /> {row.subject_id}
          </button>
        </div>
      </div>

      {(row.source_run_kind || row.request_id || (row.tags && row.tags.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {row.source_run_kind && row.source_run_id && (
            <button
              type="button"
              onClick={() =>
                onApplyFilter({ source_run_kind: row.source_run_kind!, source_run_id: row.source_run_id })
              }
              className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-700 hover:ring-1 hover:ring-blue-500/40 dark:text-blue-400"
            >
              {row.source_run_kind} · {row.source_run_id?.slice(0, 8)}
            </button>
          )}
          {row.request_id && (
            <button
              type="button"
              onClick={() => onApplyFilter({ request_id: row.request_id })}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:ring-1 hover:ring-iris/40"
            >
              req: {row.request_id.slice(0, 12)}
            </button>
          )}
          {row.tags?.map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
              #{t}
            </span>
          ))}
        </div>
      )}

      {row.notes && (
        <div className="rounded-md bg-muted/50 p-2 text-[11px]">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes · </span>
          <span>{row.notes}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => onApplyFilter({ subject_id: row.subject_id })}
        >
          Filter to this subject
        </Button>
        {row.created_by && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => onApplyFilter({ actor_id: row.created_by })}
          >
            Filter to this actor
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={copyEvidence}>
          <Copy className="mr-1 h-3 w-3" /> Copy as evidence
        </Button>
        <a
          href={`/${row.subject_kind}/${row.subject_id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] hover:bg-muted"
        >
          <ExternalLink className="h-3 w-3" /> View entity
        </a>
      </div>
    </div>
  );
}
