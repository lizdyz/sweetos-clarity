import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Panel shown on /components/$id listing all Sparks that advance this component,
 * plus a "Generate Sparks" button that calls the generate-component-sparks edge fn.
 */
export function SparksForComponentPanel({ componentId }: { componentId: string }) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: sparks = [], isLoading } = useQuery({
    queryKey: ["sparks-for-component", componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sparks")
        .select("id, name, progression_state, scope, relationship_id")
        .contains("affected_components", [componentId])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        progression_state: string | null;
        scope: string | null;
        relationship_id: string | null;
      }>;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke("generate-component-sparks", {
        body: { componentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Generated ${data?.count ?? 0} Spark proposals`);
      qc.invalidateQueries({ queryKey: ["sparks-for-component", componentId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Generation failed"),
    onSettled: () => setGenerating(false),
  });

  return (
    <section className="panel-raised p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Sparks for this Component
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={() => generate.mutate()}
          disabled={generating}
        >
          <Wand2 className="h-3 w-3" />
          {generating ? "Generating…" : "Generate Sparks"}
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sparks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No Sparks yet. Click <em>Generate Sparks</em> to propose 3–5 maturity-advancing
          interactions for this component.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sparks.map((s) => (
            <li key={s.id}>
              <Link
                to="/sparks/$id"
                params={{ id: s.id }}
                className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-iris-soft/30"
              >
                <span className="truncate">{s.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {s.progression_state ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
