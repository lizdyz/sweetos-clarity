import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConflictRow = {
  id: string;
  file_id: string;
  target_table: string;
  existing_entity_id: string | null;
  existing_entity_label: string | null;
  conflict_kind: string;
  proposed_resolution: "needs_review" | "create_new" | "update_existing" | "skip" | "merge";
  status: string;
};

export function ConflictCard({
  conflict, filename, onResolve,
}: {
  conflict: ConflictRow;
  filename: string;
  onResolve: (resolution: ConflictRow["proposed_resolution"]) => void;
}) {
  const isResolved = conflict.proposed_resolution !== "needs_review";
  return (
    <div className={cn(
      "rounded-2xl border bg-card/60 p-4",
      isResolved ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40",
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", isResolved ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {conflict.conflict_kind.replace(/_/g, " ")} · <span className="font-mono">{conflict.target_table}</span>
          </div>
          <h4 className="mt-0.5 text-sm font-semibold">
            "{conflict.existing_entity_label ?? "Existing entity"}" already exists
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Incoming file: <span className="font-mono">{filename}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={conflict.proposed_resolution} onValueChange={(v) => onResolve(v as ConflictRow["proposed_resolution"])}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needs_review">Needs review</SelectItem>
                <SelectItem value="create_new">Create new (allow duplicate)</SelectItem>
                <SelectItem value="update_existing">Update existing</SelectItem>
                <SelectItem value="skip">Skip this file</SelectItem>
                <SelectItem value="merge">Merge (advanced)</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={() => onResolve("skip")}>Skip</Button>
            <Button size="sm" onClick={() => onResolve("update_existing")}>Update existing</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
