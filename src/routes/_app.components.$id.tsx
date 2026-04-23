import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { ActiveBuildPanel } from "@/components/active-build-panel";
import { MeasuresPanel } from "@/components/measures-panel";
import { OperatorChip } from "@/components/operator-chip";
import { ComponentOutputGenerator } from "@/components/component-output-generator";
import { JTBDList } from "@/components/jtbd-list";
import { StoryTrail } from "@/components/story-trail";
import { CanonGuardrail } from "@/components/canon-guardrail";
import { SweetLensLayout } from "@/components/sweet-lens-layout";

export const Route = createFileRoute("/_app/components/$id")({
  component: ComponentDetail,
});

function ComponentDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["components", "operator", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("components")
        .select("responsible_operator_id, name")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as { responsible_operator_id: string | null; name: string | null } | null;
    },
  });
  return (
    <SweetLensLayout
      objectKind="component"
      objectId={id}
      objectTitle={data?.name ?? "Component"}
      headerLeft={
        <OperatorChip
          table="components"
          column="responsible_operator_id"
          rowId={id}
          operatorId={data?.responsible_operator_id}
          label="Responsible"
          invalidateKeys={[["components", "operator", id]]}
        />
      }
    >
      <div className="px-6">
        <CanonGuardrail entityKind="component" />
      </div>
      <ActiveBuildPanel componentId={id} />
      <EntityDetailPage entityKey="components" />
      <div className="px-6">
        <ComponentOutputGenerator componentId={id} />
      </div>
      <div className="px-6">
        <JTBDList componentId={id} />
      </div>
      <div className="px-6">
        <MeasuresPanel subjectType="component" subjectId={id} />
      </div>
      <div className="px-6 pb-8">
        <StoryTrail subjectKind="component" subjectId={id} />
      </div>
    </SweetLensLayout>
  );
}
