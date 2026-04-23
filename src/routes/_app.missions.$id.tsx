import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { MeasuresPanel } from "@/components/measures-panel";
import { TimeControls } from "@/components/time-controls";
import { CanonGuardrail } from "@/components/canon-guardrail";
import { ObjectCompanion, SweetLensButton } from "@/components/object-companion";

export const Route = createFileRoute("/_app/missions/$id")({
  component: MissionDetail,
});

function MissionDetail() {
  const { id } = Route.useParams();
  const [lensOpen, setLensOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["missions", "time", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select("created_at, name")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as { created_at: string; name: string | null } | null;
    },
  });
  return (
    <div className={lensOpen ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
      <div className="min-w-0 space-y-5">
        <div className="flex items-center justify-end gap-2 px-6 pt-5">
          <SweetLensButton active={lensOpen} onClick={() => setLensOpen((o) => !o)} />
        </div>
        <div className="px-6">
          <CanonGuardrail entityKind="mission" />
        </div>
        {data && (
          <TimeControls
            table="missions"
            rowId={id}
            createdAt={data.created_at}
            showRecurrence={false}
            doneColumn={null}
          />
        )}
        <EntityDetailPage entityKey="missions" />
        <div className="px-6 pb-8">
          <MeasuresPanel subjectType="mission" subjectId={id} />
        </div>
      </div>
      {lensOpen && (
        <div className="px-6 pt-5 lg:pr-6">
          <ObjectCompanion
            objectKind="mission"
            objectId={id}
            objectTitle={data?.name ?? "Mission"}
            className="self-start lg:sticky lg:top-4"
          />
        </div>
      )}
    </div>
  );
}
