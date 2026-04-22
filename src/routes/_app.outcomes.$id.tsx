import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { TimeControls } from "@/components/time-controls";

export const Route = createFileRoute("/_app/outcomes/$id")({
  component: OutcomeDetail,
});

function OutcomeDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["outcomes", "time", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes")
        .select("created_at, target_date, done_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-5">
      {data && (
        <TimeControls
          table="outcomes"
          rowId={id}
          createdAt={data.created_at}
          dueAt={data.target_date}
          dueColumn="target_date"
          doneAt={data.done_at}
          showRecurrence={false}
        />
      )}
      <EntityDetailPage entityKey="outcomes" />
    </div>
  );
}
