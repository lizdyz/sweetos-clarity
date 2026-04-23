import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { StoryTrail } from "@/components/story-trail";
import { SweetLensLayout } from "@/components/sweet-lens-layout";

export const Route = createFileRoute("/_app/journeys/$id")({
  component: JourneyDetail,
});

function JourneyDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["journeys", "lens-meta", id],
    queryFn: async () => {
      const { data } = await supabase.from("journeys").select("name").eq("id", id).maybeSingle();
      return data as { name: string | null } | null;
    },
  });
  return (
    <SweetLensLayout
      objectKind="journey"
      objectId={id}
      objectTitle={data?.name ?? "Journey"}
    >
      <EntityDetailPage entityKey="journeys" />
      <div className="px-6 pb-8">
        <StoryTrail subjectKind="journey" subjectId={id} />
      </div>
    </SweetLensLayout>
  );
}
