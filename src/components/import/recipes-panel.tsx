import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export type RecipeRow = {
  id: string;
  name: string;
  description: string | null;
  signature_set: unknown[];
  hit_count: number;
  created_at: string;
};

export function RecipesPanel({
  recipes, onDelete,
}: {
  recipes: RecipeRow[];
  onDelete: (id: string) => void;
}) {
  if (recipes.length === 0) {
    return (
      <div className="rounded-2xl border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        No saved recipes yet. After a run, click <em>Save as recipe</em> on the Results step to remember the decisions.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border bg-card/40">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Recipe</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="px-3 py-2 text-right">Groups</th>
            <th className="px-3 py-2 text-right">Hits</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.description ?? "—"}</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">{Array.isArray(r.signature_set) ? r.signature_set.length : 0}</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums">{r.hit_count}</td>
              <td className="px-3 py-2 text-right">
                <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)} title="Delete recipe">
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
