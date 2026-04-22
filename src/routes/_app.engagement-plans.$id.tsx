import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { MeasuresPanel } from "@/components/measures-panel";

export const Route = createFileRoute("/_app/engagement-plans/$id")({
  component: PlanDetail,
});

function PlanDetail() {
  const { id } = Route.useParams();

  const { data: services = [] } = useQuery({
    queryKey: ["engagement_services", "by-plan", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_services")
        .select("id, service_type")
        .eq("plan_id", id);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; service_type: string }>;
    },
  });

  return (
    <div className="space-y-5">
      <EntityDetailPage entityKey="engagement_plans" />
      <div className="space-y-5 px-6 pb-8">
        {services.map((s) => (
          <MeasuresPanel
            key={s.id}
            subjectType="engagement_service"
            subjectId={s.id}
            title={`Measures · ${s.service_type}`}
          />
        ))}
      </div>
    </div>
  );
}
