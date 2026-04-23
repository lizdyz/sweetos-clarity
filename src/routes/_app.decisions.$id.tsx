import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { ObjectCompanion, SweetLensButton } from "@/components/object-companion";
import { OCDAStageChip } from "@/components/ocda-stage-chip";
import { DecisionImpactRail } from "@/components/decision-impact-rail";

export const Route = createFileRoute("/_app/decisions/$id")({
  component: DecisionDetail,
});

function DecisionDetail() {
  const { id } = Route.useParams();
  const [lensOpen, setLensOpen] = useState(false);
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
    <div className={lensOpen ? "grid gap-4 px-6 pt-4 lg:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-4 px-6 pt-4"}>
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-end gap-2">
          <OCDAStageChip
            subjectTable="decisions"
            subjectId={id}
            stage={data?.ocda_stage ?? null}
            invalidate={[["decisions", "header", id]]}
          />
          <SweetLensButton active={lensOpen} onClick={() => setLensOpen((o) => !o)} />
        </div>
        <EntityDetailPage entityKey="decisions" />
        <DecisionImpactRail decisionId={id} />
      </div>
      {lensOpen && (
        <ObjectCompanion
          objectKind="decision"
          objectId={id}
          objectTitle={data?.decision ?? "Decision"}
          objectBody={data?.context}
          className="self-start lg:sticky lg:top-4"
        />
      )}
    </div>
  );
}
