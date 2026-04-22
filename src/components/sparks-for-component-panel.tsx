import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Sparkles, Wand2, BookOpen, Puzzle, Stars } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TIER_META: Record<string, { label: string; icon: typeof BookOpen; cls: string }> = {
  template: { label: "Library", icon: BookOpen, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  adapted: { label: "Adapted", icon: Puzzle, cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  generated: { label: "AI", icon: Stars, cls: "bg-iris-soft/40 text-foreground" },
};

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
        .select("id, name, progression_state, scope, relationship_id, generation_tier, template_id")
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
        generation_tier: string | null;
        template_id: string | null;
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
      const tierLabel = data?.tier === "template" ? "from library" : data?.tier === "adapted" ? "adapted from library" : "AI-generated";
      toast.success(`Generated ${data?.count ?? 0} Sparks (${tierLabel})`);
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
          {sparks.map((s) => {
            const tier = s.generation_tier && TIER_META[s.generation_tier];
            const TierIcon = tier?.icon;
            return (
              <li key={s.id}>
                <Link
                  to="/sparks/$id"
                  params={{ id: s.id }}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-iris-soft/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {tier && TierIcon ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tier.cls}`}
                        title={`${tier.label}-tier Spark`}
                      >
                        <TierIcon className="h-2.5 w-2.5" />
                        {tier.label}
                      </span>
                    ) : null}
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {s.progression_state ?? "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
