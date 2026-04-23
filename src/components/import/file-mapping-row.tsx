import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LineageStrip, type LineageData } from "./lineage-strip";

export type ClassificationRow = {
  id: string;
  file_id: string;
  group_id: string | null;
  target_object_type: string | null;
  target_table: string | null;
  matched_field_count: number;
  unmatched_field_count: number;
  confidence: number | null;
  status: "proposed" | "approved" | "excluded" | "needs_review";
};

export function FileMappingRow({
  filename, classification, registry, onChange, lineage,
}: {
  filename: string;
  classification: ClassificationRow;
  registry: { object_type: string; display_name: string; target_table: string }[];
  onChange: (patch: { target_object_type?: string | null; target_table?: string | null; status?: ClassificationRow["status"] }) => void;
  lineage?: LineageData;
}) {
  const conf = Math.round((classification.confidence ?? 0) * 100);
  return (
    <>
      <tr className="border-b last:border-0">
        <td className="px-3 py-2 text-sm">
          <div className="truncate font-medium">{filename}</div>
        </td>
        <td className="px-3 py-2">
          <Select
            value={classification.target_object_type ?? ""}
            onValueChange={(v) => {
              const r = registry.find((r) => r.object_type === v);
              onChange({ target_object_type: v || null, target_table: r?.target_table ?? null });
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Unmapped" />
            </SelectTrigger>
            <SelectContent>
              {registry.map((r) => <SelectItem key={r.object_type} value={r.object_type}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {classification.matched_field_count}/{classification.matched_field_count + classification.unmatched_field_count} mapped
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{conf}%</span>
            <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-iris" style={{ width: `${conf}%` }} />
            </div>
          </div>
        </td>
        <td className="px-3 py-2">
          <Select value={classification.status} onValueChange={(v) => onChange({ status: v as ClassificationRow["status"] })}>
            <SelectTrigger className={cn(
              "h-7 w-32 text-xs",
              classification.status === "approved" && "border-emerald-500/40",
              classification.status === "excluded" && "opacity-60",
              classification.status === "needs_review" && "border-amber-500/40",
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proposed">Proposed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="needs_review">Needs review</SelectItem>
              <SelectItem value="excluded">Excluded</SelectItem>
            </SelectContent>
          </Select>
        </td>
      </tr>
      {lineage && (
        <tr className="border-b last:border-0">
          <td colSpan={5} className="px-3 pb-2">
            <LineageStrip data={lineage} />
          </td>
        </tr>
      )}
    </>
  );
}
