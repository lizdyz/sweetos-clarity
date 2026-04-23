import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { EntityFrameworksRail } from "@/components/entity-frameworks-rail";

export const Route = createFileRoute("/_app/decisions/$id")({
  component: DecisionDetail,
});

function DecisionDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["decisions", "header", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("decisions")
        .select("decision, context")
        .eq("id", id)
        .maybeSingle();
      return data as { decision: string; context: string | null } | null;
    },
  });

  return (
    <div className="grid gap-4 px-6 pt-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <EntityDetailPage entityKey="decisions" />
      </div>
      <EntityFrameworksRail
        entityKind="decision"
        entityId={id}
        title={data?.decision ?? "Decision"}
        body={data?.context}
        className="self-start"
      />
    </div>
  );
}
