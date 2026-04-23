import { Check, X, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type GroupRow = {
  id: string;
  pattern_label: string | null;
  sample_count: number;
  proposed_object_type: string | null;
  proposed_target_table: string | null;
  confidence: number | null;
  rationale: string | null;
  status: string;
  heading_pattern: string[] | null;
  column_signature: string[] | null;
};

export type RegistryRow = {
  object_type: string;
  display_name: string;
  target_table: string;
};

export function GroupCard({
  group, registry, onApprove, onExclude, onChangeType,
}: {
  group: GroupRow;
  registry: RegistryRow[];
  onApprove: () => void;
  onExclude: () => void;
  onChangeType: (objectType: string, table: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState<string>(group.proposed_object_type ?? "");

  const conf = Math.round((group.confidence ?? 0) * 100);
  const isReview = group.status === "needs_review" || !group.proposed_object_type;
  const isApproved = group.status === "approved";
  const isExcluded = group.status === "excluded";

  return (
    <div className={cn(
      "rounded-2xl border bg-card/60 p-5 transition",
      isApproved && "border-emerald-500/30 bg-emerald-500/5",
      isExcluded && "opacity-60",
      isReview && "border-amber-500/30",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>{group.sample_count} file{group.sample_count !== 1 && "s"}</span>
            <span>·</span>
            <span className="truncate">{group.pattern_label ?? "Unknown pattern"}</span>
          </div>
          <h3 className="mt-1 text-base font-semibold">
            {isReview ? (
              <span className="text-amber-700">Needs your review</span>
            ) : (
              <>Looks like <span className="text-[color:var(--iris-violet)]">{registry.find(r => r.object_type === group.proposed_object_type)?.display_name ?? group.proposed_object_type}</span></>
            )}
          </h3>
          {group.rationale && (
            <p className="mt-1 text-xs text-muted-foreground">Matched: {group.rationale}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Confidence</div>
          <div className="text-lg font-semibold tabular-nums">{conf}%</div>
          <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-iris" style={{ width: `${conf}%` }} />
          </div>
        </div>
      </div>

      {(group.column_signature?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {group.column_signature!.slice(0, 8).map((c) => (
            <span key={c} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{c}</span>
          ))}
          {group.column_signature!.length > 8 && (
            <span className="text-[11px] text-muted-foreground">+{group.column_signature!.length - 8} more</span>
          )}
        </div>
      )}
      {(group.heading_pattern?.length ?? 0) > 0 && (
        <div className="mt-3 space-y-0.5 rounded-lg bg-muted/40 px-3 py-2 text-[11px] font-mono text-muted-foreground">
          {group.heading_pattern!.slice(0, 5).map((h, i) => <div key={i} className="truncate">{h}</div>)}
        </div>
      )}

      {editing ? (
        <div className="mt-4 flex items-center gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue placeholder="Pick an object type…" />
            </SelectTrigger>
            <SelectContent>
              {registry.map((r) => (
                <SelectItem key={r.object_type} value={r.object_type}>{r.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => {
              const r = registry.find((rr) => rr.object_type === pick);
              if (r) { onChangeType(r.object_type, r.target_table); setEditing(false); }
            }}
            disabled={!pick}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">
            {isApproved && "Approved"}
            {isExcluded && "Excluded from import"}
            {!isApproved && !isExcluded && "Awaiting your call"}
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />Change type
            </Button>
            <Button size="sm" variant="ghost" onClick={onExclude}>
              <X className="mr-1.5 h-3.5 w-3.5" />Exclude
            </Button>
            <Button size="sm" onClick={onApprove} disabled={!group.proposed_object_type}>
              <Check className="mr-1.5 h-3.5 w-3.5" />Approve all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
