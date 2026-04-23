// Step 3 — Quests. The themed bodies of work under a Journey.
// 3–6 per Journey is the recommended range. Quests carry the actual work
// (JTBDs, Components, Projects, Decisions) — managed in Step 4.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Compass, ArrowRight, ArrowLeft } from "lucide-react";
import { EntityKindHelper } from "@/components/entity-kind-helper";
import { InlineAddRow } from "./inline-add-row";
import { cn } from "@/lib/utils";

interface QuestRow {
  id: string;
  name: string;
  progression_state: string | null;
  scope: string | null;
  journey_id: string | null;
}

interface Props {
  journeyId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepQuests({ journeyId, selectedId, onSelect, onNext, onBack }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: quests = [] } = useQuery<QuestRow[]>({
    queryKey: ["planning", "quests", journeyId],
    enabled: !!journeyId,
    queryFn: async () => {
      if (!journeyId) return [];
      const { data, error } = await sb
        .from("quests")
        .select("id, name, progression_state, scope, journey_id")
        .eq("journey_id", journeyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuestRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await sb
        .from("quests")
        .insert({
          name,
          journey_id: journeyId,
          scope: "internal",
          progression_state: "Not Started",
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (row) => {
      toast.success("Quest added");
      qc.invalidateQueries({ queryKey: ["planning", "quests", journeyId] });
      onSelect(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[color:var(--iris-violet)]" />
            <h2 className="text-base font-semibold">Step 3 · Quests</h2>
            <EntityKindHelper kind="quest" />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            3–6 themed bodies of work that, taken together, deliver the Journey.
            Pick one to flesh out next (JTBDs, Components, Projects, Decisions).
          </p>
        </div>
      </header>

      <EntityKindHelper kind="quest" variant="banner" />

      <section className="rounded-2xl border border-border bg-surface/60 p-3">
        {!journeyId ? (
          <div className="px-2 py-4 text-xs text-muted-foreground">
            Pick a Journey on the previous step first.
          </div>
        ) : quests.length === 0 ? (
          <div className="px-2 py-4 text-xs text-muted-foreground">
            No quests under this Journey yet. Add the first one below.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {quests.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onSelect(q.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all",
                    selectedId === q.id
                      ? "border-[color:var(--iris-violet)]/60 bg-iris-soft/40"
                      : "border-border/60 bg-background hover:bg-muted/40",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{q.name}</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px]">
                    {q.scope && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 uppercase tracking-[0.1em] text-muted-foreground">
                        {q.scope}
                      </span>
                    )}
                    {q.progression_state && (
                      <span className="rounded-full bg-iris-soft/60 px-1.5 py-0.5 text-[color:var(--iris-violet)]">
                        {q.progression_state}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <InlineAddRow
            placeholder="e.g. Lens System · Capture-to-Routed pipeline · Operator Cockpit"
            onAdd={(v) => createMutation.mutateAsync(v).then(() => undefined)}
            busy={createMutation.isPending}
            disabled={!journeyId}
            disabledHint="Pick a Journey first."
          />
        </div>
      </section>

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
              to="/quests/$id"
              params={{ id: selectedId }}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Open full detail →
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
            Flesh out this Quest <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
