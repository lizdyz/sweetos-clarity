import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { MeasuresPanel } from "@/components/measures-panel";
import { TimeControls } from "@/components/time-controls";

export const Route = createFileRoute("/_app/missions/$id")({
  component: MissionDetail,
});

function MissionDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["missions", "time", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("created_at")
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
          table="missions"
          rowId={id}
          createdAt={data.created_at}
          showRecurrence={false}
          doneColumn={null}
        />
      )}
      <EntityDetailPage entityKey="missions" />
      <div className="px-6 pb-8">
        <MeasuresPanel subjectType="mission" subjectId={id} />
      </div>
    </div>
  );
}
