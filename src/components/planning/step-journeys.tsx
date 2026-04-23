// Step 2 — Journeys. Multi-quarter capability arcs. 2–4 active per Mission.
// Note: journeys table has no mission_id FK — we use the Mission's
// `activated_journeys` uuid[] column as the link.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Compass, ArrowRight, ArrowLeft } from "lucide-react";
import { EntityKindHelper } from "@/components/entity-kind-helper";
import { InlineAddRow } from "./inline-add-row";
import { cn } from "@/lib/utils";

interface JourneyRow {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
}

interface MissionRow {
  id: string;
  name: string;
  activated_journeys: string[];
}

interface Props {
  missionId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepJourneys({ missionId, selectedId, onSelect, onNext, onBack }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: mission } = useQuery<MissionRow | null>({
    queryKey: ["planning", "mission", missionId],
    enabled: !!missionId,
    queryFn: async () => {
      if (!missionId) return null;
      const { data } = await sb
        .from("missions")
        .select("id, name, activated_journeys")
        .eq("id", missionId)
        .maybeSingle();
      return (data as MissionRow | null) ?? null;
    },
  });

  const linkedIds = mission?.activated_journeys ?? [];

  // Show ALL journeys; mark which are linked to this mission.
  const { data: journeys = [] } = useQuery<JourneyRow[]>({
    queryKey: ["planning", "journeys"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("journeys")
        .select("id, name, description, status")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JourneyRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await sb
        .from("journeys")
        .insert({ name, status: "Active", created_by: user?.id })
        .select("id")
        .single();
      if (error) throw error;
      // Link to mission via activated_journeys
      if (missionId) {
        const next = Array.from(new Set([...(linkedIds ?? []), data.id]));
        const { error: e2 } = await sb
          .from("missions")
          .update({ activated_journeys: next })
          .eq("id", missionId);
        if (e2) throw e2;
      }
      return data as { id: string };
    },
    onSuccess: (row) => {
      toast.success("Journey added & linked to mission");
      qc.invalidateQueries({ queryKey: ["planning", "journeys"] });
      qc.invalidateQueries({ queryKey: ["planning", "mission", missionId] });
      onSelect(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLinkMutation = useMutation({
    mutationFn: async (journeyId: string) => {
      if (!missionId) return;
      const exists = linkedIds.includes(journeyId);
      const next = exists
        ? linkedIds.filter((id) => id !== journeyId)
        : Array.from(new Set([...linkedIds, journeyId]));
      const { error } = await sb
        .from("missions")
        .update({ activated_journeys: next })
        .eq("id", missionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning", "mission", missionId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linked = journeys.filter((j) => linkedIds.includes(j.id));
  const others = journeys.filter((j) => !linkedIds.includes(j.id));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[color:var(--iris-violet)]" />
            <h2 className="text-base font-semibold">Step 2 · Journeys</h2>
            <EntityKindHelper kind="journey" />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            2–4 capability arcs that, taken together, fulfil the Mission.
            Toggle existing Journeys on/off, or add a new one.
          </p>
        </div>
      </header>

      <EntityKindHelper kind="journey" variant="banner" />

      <section className="rounded-2xl border border-border bg-surface/60 p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>Linked to this Mission ({linked.length})</span>
        </div>
        {linked.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
            No journeys linked yet. Add one below or pick from existing.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {linked.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => onSelect(j.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all",
                    selectedId === j.id
                      ? "border-[color:var(--iris-violet)]/60 bg-iris-soft/40"
                      : "border-border/60 bg-background hover:bg-muted/40",
                  )}
                >
                  <span className="truncate text-sm font-medium">{j.name}</span>
                  <span className="flex items-center gap-1.5">
                    {j.status && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        {j.status}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLinkMutation.mutate(j.id);
                      }}
                      className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Unlink
                    </button>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <InlineAddRow
            placeholder="e.g. Ship v1 of Clarity to first 10 paying users"
            onAdd={(v) => createMutation.mutateAsync(v).then(() => undefined)}
            busy={createMutation.isPending}
            disabled={!missionId}
            disabledHint="Pick a Mission first."
          />
        </div>
      </section>

      {others.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-surface/40 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Other Journeys ({others.length}) — click to link
          </div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {others.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => toggleLinkMutation.mutate(j.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-background px-3 py-1.5 text-left text-xs hover:bg-iris-soft/30"
                >
                  <span className="truncate">{j.name}</span>
                  <span className="text-[10px] text-[color:var(--iris-violet)]">+ Link</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex items-center gap-2">
          {selectedId && (
            <Link
              to="/journeys/$id"
              params={{ id: selectedId }}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Open detail →
            </Link>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!selectedId}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl bg-iris px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-glow)]",
              !selectedId && "opacity-40",
            )}
          >
            Next: Quests <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
