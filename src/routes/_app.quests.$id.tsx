import { createFileRoute } from "@tanstack/react-router";
import { EntityDetailPage } from "@/components/entity-workspace";
import { StoryTrail } from "@/components/story-trail";

export const Route = createFileRoute("/_app/quests/$id")({
  component: QuestDetail,
});

function QuestDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <EntityDetailPage entityKey="quests" />
      <div className="px-6 pb-8">
        <StoryTrail subjectKind="quest" subjectId={id} />
      </div>
    </div>
  );
}
