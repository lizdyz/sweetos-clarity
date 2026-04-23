// Step 1 — Mission. The long-term WHY. One per org typically.
// Reads all missions, lets you create a new one inline, and pick the active one.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Target, ArrowRight } from "lucide-react";
import { EntityKindHelper } from "@/components/entity-kind-helper";
import { InlineAddRow } from "./inline-add-row";
import { cn } from "@/lib/utils";

interface MissionRow {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  target_timeframe: string | null;
}

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}

export function StepMission({ selectedId, onSelect, onNext }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: missions = [], isLoading } = useQuery<MissionRow[]>({
    queryKey: ["planning", "missions"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("missions")
        .select("id, name, description, status, target_timeframe")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MissionRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await sb
        .from("missions")
        .insert({ name, status: "Active", created_by: user?.id })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (row) => {
      toast.success("Mission added");
      qc.invalidateQueries({ queryKey: ["planning", "missions"] });
      onSelect(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[color:var(--iris-violet)]" />
            <h2 className="text-base font-semibold">Step 1 · Mission</h2>
            <EntityKindHelper kind="mission" />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            One sentence that won&apos;t change. Most teams have just one. If you
            already have one, pick it and move on.
          </p>
        </div>
      </header>

      <EntityKindHelper kind="mission" variant="banner" />

      <section className="rounded-2xl border border-border bg-surface/60 p-3">
        {isLoading ? (
          <div className="px-2 py-4 text-xs text-muted-foreground">Loading missions…</div>
        ) : missions.length === 0 ? (
          <div className="px-2 py-4 text-xs text-muted-foreground">
            No missions yet. Add one below — keep it to a single sentence.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {missions.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all",
                    selectedId === m.id
                      ? "border-[color:var(--iris-violet)]/60 bg-iris-soft/40"
                      : "border-border/60 bg-background hover:bg-muted/40",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.name}</div>
                    {m.description && (
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {m.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {m.target_timeframe && <span>{m.target_timeframe}</span>}
                    {m.status && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5">
                        {m.status}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <InlineAddRow
            placeholder="e.g. SweetOS Clarity is the OS for service businesses"
            onAdd={(v) => createMutation.mutateAsync(v).then(() => undefined)}
            busy={createMutation.isPending}
          />
        </div>
      </section>

      <div className="flex items-center justify-between">
        {selectedId && (
          <Link
            to="/missions/$id"
            params={{ id: selectedId }}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Open full Mission detail →
          </Link>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedId}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-xl bg-iris px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-glow)] transition-opacity",
            !selectedId && "opacity-40",
          )}
        >
          Next: Journeys <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
