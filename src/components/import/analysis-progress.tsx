import { Loader2 } from "lucide-react";

export function AnalysisProgress({
  analyzed, total, currentLabel,
}: {
  analyzed: number;
  total: number;
  currentLabel?: string | null;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((analyzed / total) * 100)) : 0;
  return (
    <div className="rounded-2xl border bg-card/50 p-4">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--iris-violet)]" />
          <span>{analyzed} / {total} files analyzed</span>
          {currentLabel && <span className="text-muted-foreground/70">· {currentLabel}</span>}
        </div>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-iris transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
