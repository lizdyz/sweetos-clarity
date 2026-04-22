import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Compass, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sb } from "@/lib/sb";
import { SweetCycleBoard, type SweetSession, type SweetPhase } from "@/components/sweetcycle-board";
import { SweetCycleMultiRelBoard } from "@/components/sweetcycle-multi-rel-board";
import { PageHeader } from "@/components/page-header";
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

  const selectedRel = rels.find((r) => r.id === relId);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">
      <PageHeader
        icon={<Compass className="h-5 w-5" />}
        title="SweetCycle"
        purpose="The 5-phase rhythm of every session — Seed (client preps) → Synthesize (we analyze) → Session (live) → Sync (recap & confirm) → Ship (delivered). Default is the cross-relationship view; pick one to drill in and drag sessions across phases."
        whatYouCanDo={[
          "See blockers and overdue phases at a glance",
          "Drag a session card to advance its phase",
          "Owner badges show whether it's on you, the client, or shared",
        ]}
        actions={
          <div className="flex items-center gap-2">
            {relId && (
              <Button size="sm" variant="ghost" onClick={() => setRelId("")} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> All relationships
              </Button>
            )}
            <Select value={relId} onValueChange={setRelId}>
              <SelectTrigger className="h-9 w-[220px]">
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
        }
      />

      {!relId ? (
        <SweetCycleMultiRelBoard onSelectRelationship={setRelId} />
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            Viewing <span className="font-medium text-foreground">{selectedRel?.name}</span>
          </div>

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
