import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb as supabase } from "@/lib/sb";
import { Calendar, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  relationshipId: string;
  className?: string;
}

interface QuestRow {
  id: string;
  name: string;
  status: string | null;
  core_workflow_id: string | null;
  related_components: string[] | null;
}

interface SparkRow {
  id: string;
  done_at: string | null;
  quest_id: string | null;
}

interface SessionRow {
  id: string;
  session_date: string | null;
  session_type: string | null;
  related_workflow_id: string | null;
}

/**
 * TwoPathsStrip — the Session ↔ SweetSync bridge widget.
 *
 * Per canon Section 3: Sessions advance the same underlying workflow that
 * SweetSync Quests/Sparks self-pace through. Both write to one shared truth.
 * This strip surfaces, per Quest's core_workflow_id, both sides of the story
 * for a given relationship so the duality is obvious.
 */
export function TwoPathsStrip({ relationshipId, className }: Props) {
  const { data: quests = [] } = useQuery({
    queryKey: ["two-paths", "quests", relationshipId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, name, status, core_workflow_id, related_components")
        .eq("relationship_id", relationshipId)
        .order("updated_at", { ascending: false });
      return (data ?? []) as QuestRow[];
    },
  });

  const questIds = quests.map((q) => q.id);
  const workflowIds = Array.from(
    new Set(quests.map((q) => q.core_workflow_id).filter((x): x is string => Boolean(x))),
  );

  const { data: sparks = [] } = useQuery({
    queryKey: ["two-paths", "sparks", questIds.join(",")],
    enabled: questIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("sparks" as never)
        .select("id, done_at, quest_id")
        .in("quest_id", questIds);
      return (data ?? []) as unknown as SparkRow[];
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["two-paths", "workflows", workflowIds.join(",")],
    enabled: workflowIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("workflows")
        .select("id, name")
        .in("id", workflowIds);
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
  const workflowName = new Map(workflows.map((w) => [w.id, w.name]));

  const { data: sessions = [] } = useQuery({
    queryKey: ["two-paths", "sessions", relationshipId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, session_date, session_type, related_workflow_id")
        .eq("relationship_id", relationshipId)
        .order("session_date", { ascending: false })
        .limit(50);
      return (data ?? []) as SessionRow[];
    },
  });

  if (quests.length === 0 && sessions.length === 0) {
    return null;
  }

  // Group: one row per quest, with paired session stats by core_workflow_id.
  const rows = quests.map((q) => {
    const questSparks = sparks.filter((s) => s.quest_id === q.id);
    const doneSparks = questSparks.filter((s) => s.done_at).length;
    const totalSparks = questSparks.length;
    const matchedSessions = q.core_workflow_id
      ? sessions.filter((s) => s.related_workflow_id === q.core_workflow_id)
      : [];
    const lastSession = matchedSessions[0];

    return {
      questId: q.id,
      questName: q.name,
      workflowName: q.core_workflow_id ? workflowName.get(q.core_workflow_id) : null,
      doneSparks,
      totalSparks,
      sessionCount: matchedSessions.length,
      lastSessionDate: lastSession?.session_date ?? null,
    };
  });

  return (
    <section className={cn("panel-raised p-5", className)}>
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Two paths · one truth
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            Sessions advance through guided cadence. SweetSync self-paces between sessions.
            Both write to the same Components.
          </p>
        </div>
        <Link
          to="/sweetsync"
          search={{ rel: relationshipId } as never}
          className="text-[11px] text-[color:var(--iris-violet)] hover:underline"
        >
          Open SweetSync →
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No active SweetSync Quests for this relationship yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.questId} className="py-2.5">
              <Link
                to="/quests/$id"
                params={{ id: r.questId }}
                className="group block rounded-lg px-2 py-1 hover:bg-iris-soft/30"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{r.questName}</span>
                  {r.workflowName && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Workflow · {r.workflowName}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 grid gap-1.5 text-[11px] sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3 text-emerald-500" />
                    <span className="font-medium text-foreground">Session-led</span>
                    <span>
                      {r.sessionCount > 0
                        ? `${r.sessionCount} session${r.sessionCount === 1 ? "" : "s"}${r.lastSessionDate ? ` · last ${new Date(r.lastSessionDate).toLocaleDateString()}` : ""}`
                        : "No sessions yet"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-[color:var(--iris-violet)]" />
                    <span className="font-medium text-foreground">Self-paced</span>
                    <span>
                      {r.totalSparks > 0
                        ? `${r.doneSparks} of ${r.totalSparks} Sparks done`
                        : "No Sparks yet"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="mt-1 hidden h-3 w-3 text-muted-foreground group-hover:inline" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
