import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export type RecipeMatch = {
  id: string;
  name: string;
  matched: number;
  total: number;
};

export function RecipeMatchBanner({
  match, onApply, onDismiss,
}: {
  match: RecipeMatch;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const pct = Math.round((match.matched / Math.max(match.total, 1)) * 100);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-iris/30 bg-iris/5 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-iris/15 text-[color:var(--iris-violet)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Recipe match</div>
          <div className="text-sm font-semibold">{match.name}</div>
          <div className="text-xs text-muted-foreground">{match.matched}/{match.total} groups match · {pct}%</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
        <Button size="sm" onClick={onApply}>Apply recipe</Button>
      </div>
    </div>
  );
}
