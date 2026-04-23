import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Compass, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { sb } from "@/lib/sb";
import { SweetCycleBoard, type SweetSession, type SweetPhase } from "@/components/sweetcycle-board";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  planId: string;
  /** "compact" = 5-phase counts + dots only. "full" = full board. Default full. */
  mode?: "compact" | "full";
}

const PHASES: SweetPhase[] = ["Seed", "Synthesize", "Session", "Sync", "Ship"];

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
export function EngagementPlanSweetCycleTab({ planId, mode = "full" }: Props) {
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

  const counts = useMemo(() => {
    const m: Record<SweetPhase, number> = {
      Seed: 0,
      Synthesize: 0,
      Session: 0,
      Sync: 0,
      Ship: 0,
    };
    for (const s of sessions) {
      const p = (s.sweetcycle_phase ?? "Seed") as SweetPhase;
      if (p in m) m[p] += 1;
    }
    return m;
  }, [sessions]);

  const nextDue = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((s) => s.phase_due_date && new Date(s.phase_due_date).getTime() >= now)
      .sort((a, b) => new Date(a.phase_due_date!).getTime() - new Date(b.phase_due_date!).getTime())[0];
  }, [sessions]);

  if (!plan) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">Loading SweetCycle…</Card>
    );
  }

  if (mode === "compact") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-1.5">
          {PHASES.map((p) => {
            const c = counts[p];
            return (
              <div
                key={p}
                className={cn(
                  "rounded-lg border border-border/50 bg-card/60 p-2 text-center transition-colors",
                  c > 0 && "border-iris/30 bg-iris-soft/30",
                )}
              >
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {p}
                </div>
                <div className="mt-1 text-base font-semibold tabular-nums">{c}</div>
                <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[color:var(--iris-violet)]">
                  {Array.from({ length: Math.min(c, 5) }).map((_, i) => (
                    <span key={i} className="h-1 w-1 rounded-full bg-current" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {nextDue ? (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
            Next due: <span className="font-medium text-foreground">{nextDue.name}</span>
            {nextDue.phase_due_date && (
              <span>· {new Date(nextDue.phase_due_date).toLocaleDateString()}</span>
            )}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {isLoading ? "Loading sessions…" : "No upcoming session deadlines."}
          </p>
        )}
      </div>
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
