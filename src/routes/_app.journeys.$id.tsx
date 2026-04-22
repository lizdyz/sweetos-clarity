import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { StoryTrail } from "@/components/story-trail";

export const Route = createFileRoute("/_app/journeys/$id")({
  component: JourneyDetail,
});

function JourneyDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <EntityDetailPage entityKey="journeys" />
      <div className="px-6 pb-8">
        <StoryTrail subjectKind="journey" subjectId={id} />
      </div>
    </div>
  );
}
