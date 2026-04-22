import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityListPage } from "@/components/entity-workspace";
import { SparkProvenanceChip } from "@/components/spark-provenance-chip";
import { PageHeader } from "@/components/page-header";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/sparks/")({
  component: SparksIndex,
});

interface RecentSpark {
  id: string;
  name: string;
  generated_by_kind: "system" | "agent" | "workflow" | null;
  origin_event: string | null;
  generator_operator_id: string | null;
}

function SparksIndex() {
  const { data: recent = [] } = useQuery({
    queryKey: ["sparks", "provenance-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sparks" as never)
        .select("id, name, generated_by_kind, origin_event, generator_operator_id")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) return [];
      return (data ?? []) as unknown as RecentSpark[];
    },
  });

  // Map operator IDs → names for chip labels.
  const operatorIds = Array.from(
    new Set(recent.map((r) => r.generator_operator_id).filter((x): x is string => Boolean(x))),
  );
  const { data: operatorMap = {} } = useQuery({
    queryKey: ["operators", "names", operatorIds.join(",")],
    enabled: operatorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("operators")
        .select("id, name")
        .in("id", operatorIds);
      const m: Record<string, string> = {};
      for (const r of data ?? []) m[r.id] = r.name;
      return m;
    },
  });

  return (
    <div className="space-y-4 px-6 pt-5">
      <PageHeader
        title="Sparks"
        icon={<Sparkles className="h-5 w-5" />}
        purpose="Atomic interactions the system generates — Question, Creation, Definition, Decision, Reflection, Action — to advance a Component."
        whatYouCanDo={[
          "Review what the system inferred",
          "Confirm, edit, or skip each one",
          "Trace provenance back to the Curator or Workflow that spawned it",
        ]}
      />
      {recent.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Recent provenance
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Where the latest sparks came from
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="mt-1.5">
                  <SparkProvenanceChip
                    kind={s.generated_by_kind}
                    generatorName={
                      s.generator_operator_id ? operatorMap[s.generator_operator_id] : undefined
                    }
                    originEvent={s.origin_event}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <EntityListPage entityKey="sparks" />
    </div>
  );
}
