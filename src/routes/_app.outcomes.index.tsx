import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityListPage } from "@/components/entity-workspace";
import { PageHeader } from "@/components/page-header";
import { Target, CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/_app/outcomes/")({
  component: OutcomesIndex,
});

interface OutcomeRow {
  id: string;
  description: string | null;
  outcome_type: string;
  done_at: string | null;
  source_kind: string;
  source_id: string | null;
}

function OutcomesIndex() {
  const { data: outcomes = [] } = useQuery({
    queryKey: ["outcomes", "rollup-pips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes")
        .select("id, description, outcome_type, done_at, source_kind, source_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OutcomeRow[];
    },
  });

  const questIds = Array.from(
    new Set(outcomes.filter((o) => o.source_kind === "quest" && o.source_id).map((o) => o.source_id!)),
  );
  const { data: questMap = {} } = useQuery({
    queryKey: ["outcomes", "quest-names", questIds.join(",")],
    enabled: questIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("quests").select("id, name").in("id", questIds);
      const m: Record<string, string> = {};
      for (const r of data ?? []) m[r.id] = r.name;
      return m;
    },
  });

  const done = outcomes.filter((o) => o.done_at).length;

  return (
    <div className="space-y-4 px-6 pt-5">
      <PageHeader
        title="Outcomes"
        icon={<Target className="h-5 w-5" />}
        purpose="Six measurable result types that reflect whether the work actually paid off. Outcomes auto-tick when the Quest, Mission, or Journey they reflect reaches Complete."
      />

      <section className="rounded-2xl border border-border bg-surface/60 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Status overview
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {done} of {outcomes.length} done
          </span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {outcomes.slice(0, 8).map((o) => {
            const isDone = Boolean(o.done_at);
            const sourceName = o.source_kind === "quest" && o.source_id ? questMap[o.source_id] : null;
            return (
              <li key={o.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-start gap-2">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/outcomes/$id"
                      params={{ id: o.id }}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {o.description ?? o.outcome_type}
                    </Link>
                    {sourceName && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        Reflects:{" "}
                        <Link
                          to="/quests/$id"
                          params={{ id: o.source_id! }}
                          className="text-[color:var(--iris-violet)] hover:underline"
                        >
                          {sourceName}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <EntityListPage entityKey="outcomes" />
    </div>
  );
}
