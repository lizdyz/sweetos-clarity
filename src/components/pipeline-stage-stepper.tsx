import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { ChevronRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STAGES = [
  "Awareness",
  "Pre-Engagement",
  "Mirror",
  "Map",
  "Machine",
  "Sync",
] as const;

type Stage = (typeof STAGES)[number];

const STAGE_HINT: Record<Stage, string> = {
  Awareness: "Cold or curious",
  "Pre-Engagement": "Tools shipped",
  Mirror: "22-domain scan",
  Map: "Roadmap build",
  Machine: "Build sprint",
  Sync: "Recap & ship",
};

function normalize(stage: string | null | undefined): Stage {
  if (!stage) return "Pre-Engagement";
  const s = stage.toLowerCase();
  if (s.includes("aware")) return "Awareness";
  if (
    s.includes("pre-mirror") ||
    s.includes("pre-engagement") ||
    s.includes("interest") ||
    s.includes("proposal")
  )
    return "Pre-Engagement";
  if (s.includes("mirror")) return "Mirror";
  if (s.includes("map")) return "Map";
  if (s.includes("machine") || s.includes("active") || s.includes("client")) return "Machine";
  if (s.includes("sync")) return "Sync";
  return "Pre-Engagement";
}

interface Props {
  relationshipId: string;
  currentStage: string | null;
  daysInStage?: number | null;
  /** When true, lets the user click a stage to advance to it. */
  interactive?: boolean;
}

/**
 * Compact horizontal pipeline stepper for one relationship.
 * Surfaces where this client sits on the same pipeline Flightdeck shows in aggregate.
 * See `mem://design/sidebar-ia.md` — Pipeline is a concept, not a route.
 */
export function PipelineStageStepper({
  relationshipId,
  currentStage,
  daysInStage,
  interactive = true,
}: Props) {
  const qc = useQueryClient();
  const current = normalize(currentStage);
  const currentIdx = STAGES.indexOf(current);

  const move = useMutation({
    mutationFn: async (next: Stage) => {
      const { error } = await sb
        .from("relationships")
        .update({ pipeline_stage: next } as never)
        .eq("id", relationshipId);
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      toast.success(`Advanced to ${next}`);
      qc.invalidateQueries({ queryKey: ["relationships", "panels", relationshipId] });
      qc.invalidateQueries({ queryKey: ["relationship-journey"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Move failed"),
  });

  const nextStage = currentIdx >= 0 && currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;

  return (
    <section className="rounded-2xl border border-border/60 bg-surface/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Plane className="h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Pipeline stage
        </span>
        {daysInStage != null && daysInStage > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {daysInStage}d in {current}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {STAGES.map((s, i) => {
          const active = s === current;
          const passed = i < currentIdx;
          const Tag = interactive ? "button" : "div";
          return (
            <div key={s} className="flex items-center gap-1">
              <Tag
                type={interactive ? "button" : undefined}
                onClick={interactive ? () => move.mutate(s) : undefined}
                disabled={interactive ? move.isPending || active : undefined}
                title={STAGE_HINT[s]}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active && "bg-iris text-white shadow-[var(--shadow-glow)]",
                  !active && passed && "bg-iris/10 text-[color:var(--iris-violet)]",
                  !active && !passed && "border border-border/60 bg-background text-muted-foreground",
                  interactive && !active && "hover:border-iris/40 hover:text-foreground",
                )}
              >
                {s}
              </Tag>
              {i < STAGES.length - 1 && (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              )}
            </div>
          );
        })}
      </div>
      {interactive && nextStage && (
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            disabled={move.isPending}
            onClick={() => move.mutate(nextStage)}
          >
            Advance to {nextStage} →
          </Button>
        </div>
      )}
    </section>
  );
}
