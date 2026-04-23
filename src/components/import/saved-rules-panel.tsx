import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export type MappingRuleRow = {
  id: string;
  pattern_kind: string;
  pattern: string;
  target_object_type: string | null;
  target_table: string | null;
  hit_count: number;
};

export function SavedRulesPanel({
  rules, onDelete,
}: {
  rules: MappingRuleRow[];
  onDelete: (id: string) => void;
}) {
  if (rules.length === 0) {
    return (
      <div className="rounded-2xl border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        No saved rules yet. Approve a group on the Mapping step and we'll remember it for next time.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border bg-card/40">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Kind</th>
            <th className="px-3 py-2 text-left">Pattern</th>
            <th className="px-3 py-2 text-left">Maps to</th>
            <th className="px-3 py-2 text-right">Hits</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.pattern_kind}</td>
              <td className="px-3 py-2 max-w-[260px] truncate font-mono text-xs">{r.pattern}</td>
              <td className="px-3 py-2 text-xs">
                {r.target_object_type ?? "—"} <span className="text-muted-foreground">/ {r.target_table ?? "—"}</span>
              </td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">{r.hit_count}</td>
              <td className="px-3 py-2 text-right">
                <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)} title="Delete rule">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
