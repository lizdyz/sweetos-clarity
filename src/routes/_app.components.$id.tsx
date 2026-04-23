import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { ActiveBuildPanel } from "@/components/active-build-panel";
import { MeasuresPanel } from "@/components/measures-panel";
import { OperatorChip } from "@/components/operator-chip";
import { ComponentOutputGenerator } from "@/components/component-output-generator";
import { JTBDList } from "@/components/jtbd-list";
import { StoryTrail } from "@/components/story-trail";
import { CanonGuardrail } from "@/components/canon-guardrail";
import { ObjectCompanion, SweetLensButton } from "@/components/object-companion";

export const Route = createFileRoute("/_app/components/$id")({
  component: ComponentDetail,
});

function ComponentDetail() {
  const { id } = Route.useParams();
  const [lensOpen, setLensOpen] = useState(false);
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
    <div className={lensOpen ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
      <div className="min-w-0 space-y-5">
        <div className="px-6 pt-5">
          <CanonGuardrail entityKind="component" />
        </div>
        <div className="flex items-center justify-end gap-2 px-6">
          <OperatorChip
            table="components"
            column="responsible_operator_id"
            rowId={id}
            operatorId={data?.responsible_operator_id}
            label="Responsible"
            invalidateKeys={[["components", "operator", id]]}
          />
          <SweetLensButton active={lensOpen} onClick={() => setLensOpen((o) => !o)} />
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
      </div>
      {lensOpen && (
        <div className="px-6 pt-5 lg:pr-6">
          <ObjectCompanion
            objectKind="component"
            objectId={id}
            objectTitle={data?.name ?? "Component"}
            className="self-start lg:sticky lg:top-4"
          />
        </div>
      )}
    </div>
  );
}
