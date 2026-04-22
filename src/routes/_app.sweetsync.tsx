import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { PageHeader } from "@/components/page-header";
import { ScopeChip } from "@/components/scope-chip";
import { Sparkles, Compass, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sweetsync")({
  component: SweetSyncBoard,
  validateSearch: (search: Record<string, unknown>) => ({
    rel: typeof search.rel === "string" ? search.rel : undefined,
  }),
});

interface RelOption {
  id: string;
  name: string;
}

interface QuestRow {
  id: string;
  name: string;
  status: string | null;
  relationship_id: string | null;
  core_workflow_id: string | null;
  related_components: string[] | null;
}

interface SparkRow {
  id: string;
  name: string;
  spark_type: string | null;
  done_at: string | null;
  scheduled_for: string | null;
  due_date: string | null;
  quest_id: string | null;
  relationship_id: string | null;
}

function SweetSyncBoard() {
  const search = Route.useSearch();
  const [selectedRel, setSelectedRel] = useState<string | undefined>(search.rel);

  const { data: relsWithSweetSync = [] } = useQuery({
    queryKey: ["sweetsync", "rels-with-quests"],
    queryFn: async () => {
      const { data: q } = await supabase
        .from("quests")
        .select("relationship_id")
        .eq("scope", "client")
        .not("relationship_id", "is", null);
      const ids = Array.from(
        new Set(((q ?? []) as Array<{ relationship_id: string | null }>).map((r) => r.relationship_id).filter((x): x is string => Boolean(x))),
      );
      if (ids.length === 0) return [] as RelOption[];
      const { data: rels } = await supabase
        .from("relationships")
        .select("id, name")
        .in("id", ids)
        .order("name", { ascending: true });
      return (rels ?? []) as RelOption[];
    },
  });

  const activeRel = selectedRel ?? relsWithSweetSync[0]?.id;

  const { data: quests = [] } = useQuery({
    queryKey: ["sweetsync", "quests", activeRel],
    enabled: Boolean(activeRel),
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, name, status, relationship_id, core_workflow_id, related_components")
        .eq("relationship_id", activeRel!)
        .order("updated_at", { ascending: false });
      return (data ?? []) as QuestRow[];
    },
  });

  const questIds = quests.map((q) => q.id);
  const { data: sparks = [] } = useQuery({
    queryKey: ["sweetsync", "sparks", questIds.join(",")],
    enabled: questIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("sparks" as never)
        .select("id, name, spark_type, done_at, scheduled_for, due_date, quest_id, relationship_id")
        .in("quest_id", questIds)
        .order("sequence_order", { ascending: true });
      return (data ?? []) as unknown as SparkRow[];
    },
  });

  return (
    <div className="space-y-4 px-6 pt-5 pb-8">
      <PageHeader
        title="SweetSync"
        icon={<Sparkles className="h-5 w-5" />}
        purpose="The self-paced path. Quests and Sparks let progress happen between sessions for one specific client. Sessions still drive the guided cadence — both advance the same Components."
        whatYouCanDo={[
          "Pick a client to see their active Quests and Sparks",
          "Open a Quest to see its core workflow and Components",
          "Confirm or complete Sparks to write to shared truth",
        ]}
      />

      {relsWithSweetSync.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No client SweetSync yet. Create a Quest and assign it to a relationship to see it here.
          <div className="mt-3">
            <Link
              to="/quests"
              className="text-[color:var(--iris-violet)] hover:underline"
            >
              Go to Quests →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Client
            </span>
            <div className="flex flex-wrap gap-1.5">
              {relsWithSweetSync.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRel(r.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activeRel === r.id
                      ? "border-[color:var(--iris-violet)] bg-iris-soft/60 text-[color:var(--iris-violet)]"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {quests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No active Quests for this client yet.
            </div>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {quests.map((q) => {
                const qSparks = sparks.filter((s) => s.quest_id === q.id);
                const done = qSparks.filter((s) => s.done_at).length;
                return (
                  <li key={q.id}>
                    <Link
                      to="/quests/$id"
                      params={{ id: q.id }}
                      className="block rounded-2xl border border-border bg-surface/60 p-4 hover:border-[color:var(--iris-violet)]/40 hover:bg-iris-soft/20"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold">{q.name}</h3>
                        <ScopeChip scope="client" relationshipId={q.relationship_id} asLink={false} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Compass className="h-3 w-3" />
                        <span>{q.status ?? "Open"}</span>
                        <span>·</span>
                        <span>
                          {qSparks.length > 0
                            ? `${done} of ${qSparks.length} Sparks done`
                            : "No Sparks yet"}
                        </span>
                      </div>
                      {qSparks.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {qSparks.slice(0, 4).map((s) => (
                            <li
                              key={s.id}
                              className="flex items-center gap-2 text-xs text-foreground/80"
                            >
                              <span
                                className={cn(
                                  "inline-block h-1.5 w-1.5 rounded-full",
                                  s.done_at
                                    ? "bg-emerald-500"
                                    : "bg-[color:var(--iris-violet)]",
                                )}
                              />
                              <span className="truncate">{s.name}</span>
                              {s.spark_type && (
                                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {s.spark_type}
                                </span>
                              )}
                            </li>
                          ))}
                          {qSparks.length > 4 && (
                            <li className="text-[11px] text-muted-foreground">
                              +{qSparks.length - 4} more
                            </li>
                          )}
                        </ul>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
