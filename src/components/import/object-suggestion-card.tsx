import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ObjectSuggestion = {
  id: string;
  proposed_name: string;
  evidence_file_ids: string[];
  suggested_fields: Array<{ name: string; type: string }> | unknown;
  rationale: string | null;
  status: string;
};

export function ObjectSuggestionCard({
  s, onApprove, onSkip,
}: {
  s: ObjectSuggestion;
  onApprove: () => void;
  onSkip: () => void;
}) {
  const fields = Array.isArray(s.suggested_fields) ? (s.suggested_fields as Array<{ name: string; type: string }>) : [];
  const isDone = s.status !== "proposed";
  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br from-iris/5 to-card/60 p-5", isDone && "opacity-60")}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-iris/15 text-[color:var(--iris-violet)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Possible new object type · {s.evidence_file_ids.length} files
          </div>
          <h3 className="text-base font-semibold">{s.proposed_name}</h3>
          {s.rationale && <p className="mt-1 text-xs text-muted-foreground">{s.rationale}</p>}

          {fields.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {fields.slice(0, 12).map((f) => (
                <span key={f.name} className="rounded-md border bg-card/60 px-2 py-0.5 text-[11px]">
                  <span className="font-mono">{f.name}</span>
                  <span className="ml-1 text-muted-foreground">{f.type}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {!isDone && (
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onSkip}>
            <X className="mr-1.5 h-3.5 w-3.5" />Not now
          </Button>
          <Button size="sm" onClick={onApprove}>
            Mark for design
          </Button>
        </div>
      )}
      {isDone && <div className="mt-3 text-right text-xs text-muted-foreground">Status: {s.status}</div>}
    </div>
  );
}
