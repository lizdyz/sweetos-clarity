// FrameworksRail variant for detail pages — mounts the v1 overlay rail and
// lets users run a lens on the open Task / Decision / Spark. The overlay
// records a Frame on the entity (logged via entity_audit_log for now —
// detailed overlay output writers ship with each overlay).

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sb } from "@/lib/sb";
import { FrameworksRail } from "@/components/frameworks-rail";
import {
  type Triageable,
  type OverlayKind,
  DEFAULT_PROMOTE_OPTIONS,
} from "@/lib/triageable";

interface Props {
  /** The entity kind (matches entity_audit_log subject_kind). */
  entityKind: "task" | "decision" | "spark";
  entityId: string;
  /** Title used to render the rail's "selected idea" hint. */
  title: string;
  body?: string | null;
  className?: string;
}

/**
 * Mounts the FrameworksRail in "always-on" mode bound to a single entity.
 * Running a lens logs an entity_audit_log row of change_type='frame_run' so
 * the Evidence footer surfaces it. Frame output rendering (rich panels) is
 * deferred to per-overlay components — this is the wiring.
 */
export function EntityFrameworksRail({ entityKind, entityId, title, body, className }: Props) {
  const qc = useQueryClient();
  const [frames, setFrames] = useState<Triageable["frames"]>([]);

  const target: Triageable = {
    id: entityId,
    kind: entityKind === "spark" ? "spark" : entityKind === "decision" ? "decision_input" : "task",
    title,
    body: body ?? null,
    source: { kind: entityKind, id: entityId, label: entityKind },
    state: "active",
    frames,
    promote_options: DEFAULT_PROMOTE_OPTIONS,
    provenance: { upstream: [], downstream: [] },
  };

  const runOverlay = useMutation({
    mutationFn: async (overlay: OverlayKind) => {
      const { error } = await sb.from("entity_audit_log").insert({
        subject_kind: entityKind,
        subject_id: entityId,
        change_type: "frame_run",
        field: overlay,
        source: "user",
        notes: `Ran ${overlay} lens on ${entityKind}`,
        new_value: { overlay_kind: overlay },
      });
      if (error) throw error;
      setFrames((prev) => [
        ...prev,
        { overlay_kind: overlay, output: {}, ran_at: new Date().toISOString() },
      ]);
    },
    onSuccess: () => {
      toast.success("Frame attached — see Evidence footer");
      qc.invalidateQueries({ queryKey: ["entity_audit_log", entityKind, entityId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <FrameworksRail
      target={target}
      onRunOverlay={(_t, overlay) => runOverlay.mutate(overlay)}
      className={className}
    />
  );
}
