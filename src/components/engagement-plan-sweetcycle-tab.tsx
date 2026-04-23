import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { sb } from "@/lib/sb";
import { SweetCycleBoard, type SweetSession, type SweetPhase } from "@/components/sweetcycle-board";
import { toast } from "sonner";

interface Props {
  planId: string;
}

interface PlanLite {
  id: string;
  relationship_id: string;
  plan_name: string;
}

/**
 * SweetCycle view scoped to a single Engagement Plan.
 * Shows all sessions for the plan's relationship on the 5-phase board.
 * (Sessions don't yet carry plan_id directly — they belong to the relationship,
 * which is the right grain since one active plan owns the rhythm at a time.)
 */
export function EngagementPlanSweetCycleTab({ planId }: Props) {
  const qc = useQueryClient();

  const { data: plan } = useQuery<PlanLite | null>({
    queryKey: ["engagement_plan-lite", planId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("engagement_plans")
        .select("id, relationship_id, plan_name")
        .eq("id", planId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const relId = plan?.relationship_id ?? "";

  const { data: sessions = [], isLoading } = useQuery<SweetSession[]>({
    queryKey: ["sweetcycle-sessions", relId],
    enabled: !!relId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("sessions")
        .select("id, name, sweetcycle_phase, phase_owner, phase_due_date, phase_blocker, session_date")
        .eq("relationship_id", relId)
        .order("session_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SweetSession[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, phase }: { id: string; phase: SweetPhase }) => {
      const { error } = await sb
        .from("sessions")
        .update({ sweetcycle_phase: phase } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Phase moved");
      qc.invalidateQueries({ queryKey: ["sweetcycle-sessions", relId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Move failed"),
  });

  if (!plan) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">Loading SweetCycle…</Card>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[color:var(--iris-violet)]" />
            <h2 className="text-sm font-semibold tracking-tight">SweetCycle for this engagement</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            The 5-phase rhythm of every session — Seed (client preps) → Synthesize (we analyze) → Session (live) →
            Sync (recap & confirm) → Ship (delivered). Drag a card to advance its phase.
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {isLoading ? "loading…" : `${sessions.length} sessions`}
        </span>
      </div>
      <SweetCycleBoard
        sessions={sessions}
        onMove={(id, phase) => move.mutate({ id, phase })}
        emptyHint="No sessions yet for this relationship. Schedule one from the Sessions Bank."
      />
    </Card>
  );
}
