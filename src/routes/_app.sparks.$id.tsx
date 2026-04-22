import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { TimeControls } from "@/components/time-controls";

export const Route = createFileRoute("/_app/sparks/$id")({
  component: SparkDetail,
});

function SparkDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["sparks", "time", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sparks" as never)
        .select("created_at, scheduled_for, not_before, due_date, recurrence_rule, done_at")
        .eq("id", id)
        .maybeSingle();
      if (error) return null;
      return data as unknown as {
        created_at: string;
        scheduled_for: string | null;
        not_before: string | null;
        due_date: string | null;
        recurrence_rule: string | null;
        done_at: string | null;
      } | null;
    },
  });
  return (
    <div className="space-y-5">
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
