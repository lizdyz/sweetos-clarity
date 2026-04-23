import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { StoryTrail } from "@/components/story-trail";
import { ObjectCompanion, SweetLensButton } from "@/components/object-companion";

export const Route = createFileRoute("/_app/journeys/$id")({
  component: JourneyDetail,
});

function JourneyDetail() {
  const { id } = Route.useParams();
  const [lensOpen, setLensOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["journeys", "lens-meta", id],
    queryFn: async () => {
      const { data } = await supabase.from("journeys").select("name").eq("id", id).maybeSingle();
      return data as { name: string | null } | null;
    },
  });
  return (
    <div className={lensOpen ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
      <div className="min-w-0 space-y-5">
        <div className="flex items-center justify-end gap-2 px-6 pt-5">
          <SweetLensButton active={lensOpen} onClick={() => setLensOpen((o) => !o)} />
        </div>
        <EntityDetailPage entityKey="journeys" />
        <div className="px-6 pb-8">
          <StoryTrail subjectKind="journey" subjectId={id} />
        </div>
      </div>
      {lensOpen && (
        <div className="px-6 pt-5 lg:pr-6">
          <ObjectCompanion
            objectKind="journey"
            objectId={id}
            objectTitle={data?.name ?? "Journey"}
            className="self-start lg:sticky lg:top-4"
          />
        </div>
      )}
    </div>
  );
}
