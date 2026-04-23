import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type ImportStep = "upload" | "analysis" | "mapping" | "conflicts" | "schema" | "import" | "results";

const STEPS: { id: ImportStep; label: string; sub: string }[] = [
  { id: "upload",    label: "Upload",    sub: "Drop your files" },
  { id: "analysis",  label: "Analysis",  sub: "Detect & group" },
  { id: "mapping",   label: "Mapping",   sub: "Approve targets" },
  { id: "conflicts", label: "Conflicts", sub: "Existing entities" },
  { id: "schema",    label: "Schema",    sub: "New fields & types" },
  { id: "import",    label: "Import",    sub: "Run it" },
  { id: "results",   label: "Results",   sub: "What landed" },
];

export function ImportStepper({
  active, onSelect, completed, conflictsCount,
}: {
  active: ImportStep;
  onSelect: (s: ImportStep) => void;
  completed: Set<ImportStep>;
  conflictsCount?: number;
}) {
  return (
    <div className="rounded-2xl border bg-card/50 p-2">
      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-7">
        {STEPS.map((s, i) => {
          const isActive = s.id === active;
          const isDone = completed.has(s.id);
          const showBadge = s.id === "conflicts" && (conflictsCount ?? 0) > 0;
          return (
            <li key={s.id}>
              <button
                onClick={() => onSelect(s.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition",
                  isActive ? "bg-iris/10 ring-1 ring-iris/30" : "hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                    isActive ? "border-iris bg-iris text-white" :
                    isDone   ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" :
                               "border-border bg-background text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("flex items-center gap-1.5 text-[13px] font-semibold leading-tight", isActive ? "text-foreground" : "text-foreground/80")}>
                    {s.label}
                    {showBadge && (
                      <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-700">{conflictsCount}</span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">{s.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
