import { useState, useMemo } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditFilterRail } from "@/components/audit/audit-filter-rail";
import { AuditResultsTable } from "@/components/audit/audit-results-table";
import { AuditSummaryStrip } from "@/components/audit/audit-summary-strip";
import { AuditSavedViews } from "@/components/audit/audit-saved-views";
import { listAuditEvents } from "@/utils/audit.functions";
import type { AuditEventRow, AuditFilters } from "@/lib/audit";
import { toast } from "sonner";

interface AuditSearch {
  subject_kind?: string;
  subject_id?: string;
  source_run_kind?: string;
  source_run_id?: string;
  request_id?: string;
  actor_id?: string;
}

export const Route = createFileRoute("/_app/audit")({
  validateSearch: (search: Record<string, unknown>): AuditSearch => ({
    subject_kind: typeof search.subject_kind === "string" ? search.subject_kind : undefined,
    subject_id: typeof search.subject_id === "string" ? search.subject_id : undefined,
    source_run_kind: typeof search.source_run_kind === "string" ? search.source_run_kind : undefined,
    source_run_id: typeof search.source_run_id === "string" ? search.source_run_id : undefined,
    request_id: typeof search.request_id === "string" ? search.request_id : undefined,
    actor_id: typeof search.actor_id === "string" ? search.actor_id : undefined,
  }),
  head: () => ({
    meta: [{ title: "Audit Trail · SweetBOS" }],
  }),
  component: AuditPage,
});

const PAGE_SIZE = 60;

function AuditPage() {
  const search = useSearch({ from: "/_app/audit" });
  const listFn = useServerFn(listAuditEvents);

  const [filters, setFilters] = useState<AuditFilters>(() => ({
    date_range: "7d",
    subject_id: search.subject_id ?? null,
    subject_kinds: search.subject_kind ? [search.subject_kind] : undefined,
    source_run_kind: search.source_run_kind ?? null,
    source_run_id: search.source_run_id ?? null,
    request_id: search.request_id ?? null,
    actor_id: search.actor_id ?? null,
    limit: PAGE_SIZE,
    offset: 0,
  }));

  const queryKey = useMemo(() => ["audit-events", filters], [filters]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => listFn({ data: filters }),
    refetchInterval: 30000,
  });

  const rows: AuditEventRow[] = data?.rows ? (JSON.parse(data.rows) as AuditEventRow[]) : [];
  const total = data?.total ?? 0;

  function applyPatch(patch: Partial<AuditFilters>) {
    setFilters((f) => ({ ...f, ...patch, offset: 0 }));
  }

  function handleReset() {
    setFilters({ date_range: "7d", limit: PAGE_SIZE, offset: 0 });
  }

  function handleApplyView(viewFilters: AuditFilters) {
    setFilters({ ...viewFilters, limit: PAGE_SIZE, offset: 0 });
  }

  function exportCSV() {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = [
      "created_at",
      "actor",
      "category",
      "severity",
      "source",
      "subject_kind",
      "subject_id",
      "subject_label",
      "field",
      "change_type",
      "old_value",
      "new_value",
      "notes",
      "source_run_kind",
      "source_run_id",
      "request_id",
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.created_at,
          r.actor_display_name ?? r.created_by ?? "",
          r.event_category,
          r.severity,
          r.source,
          r.subject_kind,
          r.subject_id,
          r.subject_label ?? "",
          r.field ?? "",
          r.change_type,
          r.old_value,
          r.new_value,
          r.notes ?? "",
          r.source_run_kind ?? "",
          r.source_run_id ?? "",
          r.request_id ?? "",
        ]
          .map(escape)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows`);
  }

  function exportJSONL() {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const lines = rows.map((r) => JSON.stringify(r)).join("\n");
    const blob = new Blob([lines], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows as JSONL`);
  }

  const offset = filters.offset ?? 0;
  const hasMore = offset + rows.length < total;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header strip */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-iris/10 text-iris">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Audit Trail</h1>
            <p className="text-[11px] text-muted-foreground">
              System-of-record · append-only · operational, security, and compliance review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AuditSavedViews currentFilters={filters} onApply={handleApplyView} />
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7" onClick={exportCSV}>
            <Download className="mr-1 h-3 w-3" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-7" onClick={exportJSONL}>
            <Download className="mr-1 h-3 w-3" /> JSONL
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AuditFilterRail
          filters={filters}
          onChange={(next) => setFilters({ ...next, offset: 0 })}
          onReset={handleReset}
        />

        <main className="flex flex-1 flex-col overflow-hidden">
          <AuditSummaryStrip rows={rows} total={total} />
          <div className="flex-1 overflow-auto">
            <AuditResultsTable rows={rows} loading={isLoading} onApplyFilter={applyPatch} />
          </div>
          {(offset > 0 || hasMore) && (
            <div className="flex items-center justify-between border-t border-border bg-surface/40 px-4 py-2 text-xs">
              <span className="text-muted-foreground">
                Showing {offset + 1}–{offset + rows.length} of {total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={offset === 0}
                  onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - PAGE_SIZE) }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={!hasMore}
                  onClick={() => setFilters((f) => ({ ...f, offset: (f.offset ?? 0) + PAGE_SIZE }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
