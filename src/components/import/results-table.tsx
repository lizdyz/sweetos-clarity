import { Fragment } from "react";
import { Check, SkipForward, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineageStrip, type LineageData } from "./lineage-strip";

export type ResultRow = {
  id: string;
  file_id: string;
  status: "created" | "updated" | "skipped" | "failed";
  created_entity_kind: string | null;
  created_entity_id: string | null;
  created_entity_table: string | null;
  notes: string | null;
  error_message: string | null;
};

export function ResultsTable({
  results, filenameOf, lineageFor,
}: {
  results: ResultRow[];
  filenameOf: (fileId: string) => string;
  lineageFor?: (fileId: string) => LineageData;
}) {
  if (results.length === 0) {
    return <div className="rounded-xl border bg-card/40 p-6 text-center text-sm text-muted-foreground">No import results yet — run the import to see outcomes.</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border bg-card/40">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">File</th>
            <th className="px-3 py-2 text-left">Outcome</th>
            <th className="px-3 py-2 text-left">Entity</th>
            <th className="px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <Fragment key={r.id}>
              <tr className="border-t">
                <td className="px-3 py-2 font-medium">{filenameOf(r.file_id)}</td>
                <td className="px-3 py-2">
                  <StatusChip status={r.status} />
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.created_entity_kind ? (
                    <span><span className="font-mono">{r.created_entity_table}</span> · {r.created_entity_id?.slice(0, 8)}…</span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.error_message ? <span className="text-rose-600">{r.error_message}</span> : (r.notes ?? "")}
                </td>
              </tr>
              {lineageFor && (
                <tr>
                  <td colSpan={4} className="px-3 pb-2">
                    <LineageStrip data={lineageFor(r.file_id)} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusChip({ status }: { status: ResultRow["status"] }) {
  const map: Record<ResultRow["status"], { icon: typeof Check; tone: string; label: string }> = {
    created:  { icon: Check,         tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30", label: "Created" },
    updated:  { icon: Check,         tone: "text-sky-600 bg-sky-500/10 border-sky-500/30",             label: "Updated" },
    skipped:  { icon: SkipForward,   tone: "text-muted-foreground bg-muted border-border",             label: "Skipped" },
    failed:   { icon: X,             tone: "text-rose-600 bg-rose-500/10 border-rose-500/30",          label: "Failed"  },
  };
  const c = map[status];
  const I = c.icon;
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", c.tone)}><I className="h-3 w-3" />{c.label}</span>;
}
