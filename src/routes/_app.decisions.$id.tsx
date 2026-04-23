import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { SweetLensLayout } from "@/components/sweet-lens-layout";
import { OCDAStageChip } from "@/components/ocda-stage-chip";
import { DecisionImpactRail } from "@/components/decision-impact-rail";

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
        .select("decision, context, ocda_stage")
        .eq("id", id)
        .maybeSingle();
      return data as { decision: string; context: string | null; ocda_stage: string | null } | null;
    },
  });

  return (
    <SweetLensLayout
      objectKind="decision"
      objectId={id}
      objectTitle={data?.decision ?? "Decision"}
      objectBody={data?.context}
      headerLeft={
        <OCDAStageChip
          subjectTable="decisions"
          subjectId={id}
          stage={data?.ocda_stage ?? null}
          invalidate={[["decisions", "header", id]]}
        />
      }
    >
      <EntityDetailPage entityKey="decisions" />
      <DecisionImpactRail decisionId={id} />
    </SweetLensLayout>
  );
}
