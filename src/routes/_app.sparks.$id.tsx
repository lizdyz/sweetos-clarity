import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { TimeControls } from "@/components/time-controls";
import { SparkProvenanceChip } from "@/components/spark-provenance-chip";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/sparks/$id")({
  component: SparkDetail,
});

interface SparkRow {
  id: string;
  name: string;
  spark_type: string | null;
  created_at: string;
  scheduled_for: string | null;
  not_before: string | null;
  due_date: string | null;
  recurrence_rule: string | null;
  done_at: string | null;
  generated_by_kind: "system" | "agent" | "workflow" | null;
  origin_event: string | null;
  generator_operator_id: string | null;
  quest_id: string | null;
}

function SparkDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["sparks", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sparks" as never)
        .select(
          "id, name, spark_type, created_at, scheduled_for, not_before, due_date, recurrence_rule, done_at, generated_by_kind, origin_event, generator_operator_id, quest_id",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) return null;
      return data as unknown as SparkRow | null;
    },
  });
  const { data: operator } = useQuery({
    queryKey: ["operators", "ref", data?.generator_operator_id],
    enabled: !!data?.generator_operator_id,
    queryFn: async () => {
      const { data: op } = await supabase
        .from("operators")
        .select("id, name")
        .eq("id", data!.generator_operator_id!)
        .maybeSingle();
      return op;
    },
  });
  const { data: quest } = useQuery({
    queryKey: ["quests", "ref", data?.quest_id],
    enabled: !!data?.quest_id,
    queryFn: async () => {
      const { data: q } = await supabase
        .from("quests")
        .select("id, name, related_components")
        .eq("id", data!.quest_id!)
        .maybeSingle();
      return q as { id: string; name: string; related_components: string[] | null } | null;
    },
  });
  const { data: components = [] } = useQuery({
    queryKey: ["components", "by-quest", quest?.id, quest?.related_components?.join(",")],
    enabled: !!quest?.related_components?.length,
    queryFn: async () => {
      const { data } = await supabase
        .from("components")
        .select("id, name")
        .in("id", quest!.related_components!);
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  // Fire confetti once when spark transitions to done.
  const lastDoneRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (lastDoneRef.current === undefined) {
      lastDoneRef.current = data?.done_at ?? null;
      return;
    }
    if (!lastDoneRef.current && data?.done_at) {
      void confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.3 },
        colors: ["#7c3aed", "#a78bfa", "#ec4899", "#22d3ee"],
      });
    }
    lastDoneRef.current = data?.done_at ?? null;
  }, [data?.done_at]);

  return (
    <div className="space-y-5">
      {data && (
        <div className="px-6 pt-4">
          <SparkProvenanceChip
            kind={data.generated_by_kind}
            generatorName={operator?.name}
            originEvent={data.origin_event}
          />
        </div>
      )}
      {data && (quest || components.length > 0) && (
        <div className="px-6">
          <ImpactPreview
            sparkType={data.spark_type}
            isDone={!!data.done_at}
            quest={quest ?? null}
            components={components}
          />
        </div>
      )}
      {data && (
        <TimeControls
          table="sparks"
          rowId={id}
          createdAt={data.created_at}
          scheduledFor={data.scheduled_for}
          notBefore={data.not_before}
          dueAt={data.due_date}
          doneAt={data.done_at}
          recurrenceRule={data.recurrence_rule}
        />
      )}
      <EntityDetailPage entityKey="sparks" />
    </div>
  );
}

function ImpactPreview({
  sparkType,
  isDone,
  quest,
  components,
}: {
  sparkType: string | null;
  isDone: boolean;
  quest: { id: string; name: string } | null;
  components: Array<{ id: string; name: string }>;
}) {
  return (
    <section className="panel-raised flex flex-wrap items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-iris-soft text-[color:var(--iris-violet)]">
        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isDone ? "This spark advanced" : "Completing this spark advances"}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {quest && (
            <Link
              to="/quests/$id"
              params={{ id: quest.id }}
              className="inline-flex items-center gap-1 font-medium text-foreground hover:text-[color:var(--iris-violet)]"
            >
              Quest · {quest.name}
            </Link>
          )}
          {components.map((c, i) => (
            <span key={c.id} className="inline-flex items-center gap-2 text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              <Link
                to="/components/$id"
                params={{ id: c.id }}
                className="font-medium text-foreground hover:text-[color:var(--iris-violet)]"
              >
                {c.name}
              </Link>
              {i === components.length - 1 && sparkType && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {sparkType}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
