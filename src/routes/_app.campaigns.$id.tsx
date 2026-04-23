import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { MeasuresPanel } from "@/components/measures-panel";
import { TimeControls } from "@/components/time-controls";
import { JTBDChips } from "@/components/jtbd-chips";

export const Route = createFileRoute("/_app/campaigns/$id")({
  component: CampaignDetail,
});

function CampaignDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["campaigns", "time", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("created_at, scheduled_for, not_before, deadline, recurrence_rule")
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
          table="campaigns"
          rowId={id}
          createdAt={data.created_at}
          scheduledFor={data.scheduled_for}
          notBefore={data.not_before}
          dueAt={data.deadline}
          dueColumn="deadline"
          doneColumn={null}
          recurrenceRule={data.recurrence_rule}
        />
      )}
      <EntityDetailPage entityKey="campaigns" />
      <div className="px-6">
        <JTBDChips subject="campaign" subjectId={id} />
      </div>
      <div className="px-6 pb-8">
        <MeasuresPanel subjectType="campaign" subjectId={id} />
      </div>
    </div>
  );
}
