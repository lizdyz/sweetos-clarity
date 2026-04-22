import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Compass, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sb } from "@/lib/sb";
import { SweetCycleBoard, type SweetSession, type SweetPhase } from "@/components/sweetcycle-board";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sweetcycle")({
  component: SweetCyclePage,
});

interface RelOpt { id: string; name: string }
interface Service {
  id: string;
  service_type: string;
  status: string;
  sessions_purchased: number | null;
  sessions_used: number | null;
}

function SweetCyclePage() {
  const qc = useQueryClient();
  const [relId, setRelId] = useState<string>("");

  const { data: rels = [] } = useQuery<RelOpt[]>({
    queryKey: ["sweetcycle-rels"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationships")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["sweetcycle-services", relId],
    enabled: !!relId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("engagement_services")
        .select("id, service_type, status, sessions_purchased, sessions_used")
        .eq("relationship_id", relId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sessions = [], isLoading } = useQuery<SweetSession[]>({
    queryKey: ["sweetcycle-sessions", relId],
    enabled: !!relId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("sessions")
        .select(
          "id, name, sweetcycle_phase, phase_owner, phase_due_date, phase_blocker, session_date",
        )
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

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris/10 text-[color:var(--iris-violet)]">
            <Compass className="h-5 w-5" />
          </div>
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight">SweetCycle</h1>
            <p className="text-sm text-muted-foreground">
              The 5-phase rhythm of every session: <strong>Seed</strong> (client prep) →{" "}
              <strong>Synthesize</strong> (our analysis) → <strong>Session</strong> (live work) →{" "}
              <strong>Sync</strong> (recap & confirm) → <strong>Ship</strong> (delivered).
              Pick a relationship to see where each session is in the cycle, and drag to advance.
            </p>
          </div>
        </div>
        <div className="min-w-[260px]">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Relationship
          </label>
          <Select value={relId} onValueChange={setRelId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pick a relationship…" />
            </SelectTrigger>
            <SelectContent>
              {rels.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {!relId ? (
        <Card className="border-dashed bg-surface/40 p-10 text-center text-sm text-muted-foreground">
          Choose a relationship above to see its SweetCycle board.
        </Card>
      ) : (
        <>
          {services.length > 0 && (
            <Card className="p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active engagement services
              </div>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => {
                  const remaining =
                    (s.sessions_purchased ?? 0) - (s.sessions_used ?? 0);
                  return (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border/60 bg-surface px-3 py-1.5 text-xs"
                    >
                      <div className="font-medium">{s.service_type}</div>
                      <div className="text-[10px] text-muted-foreground">
                        <Badge variant="secondary" className="mr-1 h-4 text-[9px]">
                          {s.status}
                        </Badge>
                        {s.sessions_purchased != null
                          ? `${s.sessions_used ?? 0}/${s.sessions_purchased} sessions · ${remaining} left`
                          : "—"}
                      </div>
                    </div>
                  );
                })}
                <Link
                  to="/engagement-plans"
                  className="self-center text-[11px] text-[color:var(--iris-violet)] hover:underline"
                >
                  Manage engagement plan →
                </Link>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Sessions in cycle</h2>
              <span className="text-[11px] text-muted-foreground">
                {isLoading ? "loading…" : `${sessions.length} sessions`}
              </span>
            </div>
            <SweetCycleBoard
              sessions={sessions}
              onMove={(id, phase) => move.mutate({ id, phase })}
              emptyHint="No sessions yet for this relationship. Schedule one from the Sessions page."
            />
          </Card>
        </>
      )}
    </div>
  );
}
