import { createFileRoute, useParams } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { DomainAssessmentTimeline } from "@/components/domain-assessment-timeline";

export const Route = createFileRoute("/_app/domain-assessments/$id")({
  component: DomainAssessmentDetail,
});

function DomainAssessmentDetail() {
  const { id } = useParams({ from: "/_app/domain-assessments/$id" });
  return (
    <div className="space-y-4">
      <EntityDetailPage entityKey="domain-assessments" />
      {id && id !== "new" && (
        <div className="px-6 pb-6">
          <DomainAssessmentTimeline assessmentId={id} />
        </div>
      )}
    </div>
  );
}
