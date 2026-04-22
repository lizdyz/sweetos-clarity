import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { TimeControls } from "@/components/time-controls";
import { SparkProvenanceChip } from "@/components/spark-provenance-chip";

export const Route = createFileRoute("/_app/sparks/$id")({
  component: SparkDetail,
});

interface SparkRow {
  created_at: string;
  scheduled_for: string | null;
  not_before: string | null;
  due_date: string | null;
  recurrence_rule: string | null;
  done_at: string | null;
  generated_by_kind: "system" | "agent" | "workflow" | null;
  origin_event: string | null;
  generator_operator_id: string | null;
}

function SparkDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["sparks", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sparks" as never)
        .select(
          "created_at, scheduled_for, not_before, due_date, recurrence_rule, done_at, generated_by_kind, origin_event, generator_operator_id",
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
