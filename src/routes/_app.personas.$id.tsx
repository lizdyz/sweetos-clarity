import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { JTBDList } from "@/components/jtbd-list";
import { ObjectCompanion, SweetLensButton } from "@/components/object-companion";

export const Route = createFileRoute("/_app/personas/$id")({
  component: PersonaDetail,
});

function PersonaDetail() {
  const { id } = Route.useParams();
  const [lensOpen, setLensOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["personas", "lens-meta", id],
    queryFn: async () => {
      const { data } = await supabase.from("personas").select("name").eq("id", id).maybeSingle();
      return data as { name: string | null } | null;
    },
  });
  return (
    <div className={lensOpen ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
      <div className="min-w-0 space-y-5">
        <div className="flex items-center justify-end gap-2 px-6 pt-5">
          <SweetLensButton active={lensOpen} onClick={() => setLensOpen((o) => !o)} />
        </div>
        <EntityDetailPage entityKey="personas" />
        <div className="px-6 pb-8">
          <JTBDList personaId={id} />
        </div>
      </div>
      {lensOpen && (
        <div className="px-6 pt-5 lg:pr-6">
          <ObjectCompanion
            objectKind="persona"
            objectId={id}
            objectTitle={data?.name ?? "Persona"}
            className="self-start lg:sticky lg:top-4"
          />
        </div>
      )}
    </div>
  );
}
