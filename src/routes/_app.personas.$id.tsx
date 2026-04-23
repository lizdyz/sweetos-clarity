import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { JTBDList } from "@/components/jtbd-list";
import { SweetLensLayout } from "@/components/sweet-lens-layout";

export const Route = createFileRoute("/_app/personas/$id")({
  component: PersonaDetail,
});

function PersonaDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["personas", "lens-meta", id],
    queryFn: async () => {
      const { data } = await supabase.from("personas").select("name").eq("id", id).maybeSingle();
      return data as { name: string | null } | null;
    },
  });
  return (
    <SweetLensLayout
      objectKind="persona"
      objectId={id}
      objectTitle={data?.name ?? "Persona"}
    >
      <EntityDetailPage entityKey="personas" />
      <div className="px-6 pb-8">
        <JTBDList personaId={id} />
      </div>
    </SweetLensLayout>
  );
}
