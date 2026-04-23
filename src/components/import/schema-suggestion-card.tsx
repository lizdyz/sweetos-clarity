import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Check, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export type SchemaSuggestion = {
  id: string;
  source_column: string;
  sample_values: string[];
  guessed_type: string | null;
  suggested_destination_table: string | null;
  suggested_field_name: string | null;
  occurrence_count: number;
  status: string;
};

export function SchemaSuggestionCard({
  s, onApprove, onSkip,
}: {
  s: SchemaSuggestion;
  onApprove: (fieldName: string) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState(s.suggested_field_name ?? s.source_column);
  const isDone = s.status !== "proposed";

  return (
    <div className={cn("rounded-xl border bg-card/60 p-4", isDone && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>{s.occurrence_count} file{s.occurrence_count !== 1 && "s"}</span>
            <span>·</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{s.guessed_type ?? "text"}</span>
          </div>
          <div className="mt-1 font-mono text-sm font-semibold">{s.source_column}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Suggested home: <span className="font-mono">{s.suggested_destination_table ?? "—"}</span>
          </div>
          {s.sample_values.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {s.sample_values.slice(0, 4).map((v, i) => (
                <span key={i} className="max-w-[140px] truncate rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isDone && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 flex-1 font-mono text-xs"
            placeholder="field_name"
          />
          <Button size="sm" variant="ghost" onClick={onSkip}>
            <SkipForward className="mr-1.5 h-3.5 w-3.5" />Skip
          </Button>
          <Button size="sm" onClick={() => onApprove(name)}>
            <Check className="mr-1.5 h-3.5 w-3.5" />Approve
          </Button>
        </div>
      )}
      {isDone && <div className="mt-3 text-xs text-muted-foreground">Status: {s.status}</div>}
    </div>
  );
}
