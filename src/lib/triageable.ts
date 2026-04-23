// Shared "Triageable" interface used by /sandbox, Sparks, KTI fires, inbound
// signals, and OCDA Observe lane. The contract: every triageable entity gets
// the same select → promote gesture. Framework runs are now performed by the
// SweetLens / ObjectCompanion sidebar, not by the legacy OVERLAY_REGISTRY.

export type TriageKind =
  | "sandbox_item"
  | "spark"
  | "kti"
  | "task"
  | "decision_input"
  | "inbound_signal";

export type TriageState = "raw" | "framed" | "routed" | "archived" | "active";

/** Kept for backwards-compat with existing `frames` JSONB column on sandbox_items. */
export type OverlayKind =
  | "5ps"
  | "bizzybot_lens"
  | "kti_candidate"
  | "domain_tenet_fit"
  | "decision_readiness"
  | "op_alpha";

export interface Frame {
  overlay_kind: OverlayKind;
  output: Record<string, unknown>;
  ran_at: string;
  ran_by?: string;
}

export type PromoteActionKind =
  | "task"
  | "project"
  | "spark"
  | "decision"
  | "decision_input"
  | "component_canon"
  | "archive";

export interface PromoteAction {
  kind: PromoteActionKind;
  label: string;
  hint?: string;
}

export interface Ref {
  kind: string;
  id: string;
  label: string;
}

export interface Triageable {
  id: string;
  kind: TriageKind;
  title: string;
  body?: string | null;
  source: { kind: string; id: string | null; label: string };
  state: TriageState;
  frames: Frame[];
  promote_options: PromoteAction[];
  provenance: { upstream: Ref[]; downstream: Ref[] };
  created_at?: string;
  confidence?: number | null;
  relationship_id?: string | null;
}

export const DEFAULT_PROMOTE_OPTIONS: PromoteAction[] = [
  { kind: "task", label: "→ Task", hint: "Create an executable task with provenance back here" },
  { kind: "project", label: "→ Project", hint: "Spawn a project with this idea as the brief" },
  { kind: "spark", label: "→ Spark", hint: "Convert to a system-attributed Spark" },
  { kind: "decision", label: "→ Decision", hint: "Log a formal Decision (status=decided) with provenance" },
  { kind: "decision_input", label: "→ Decision input", hint: "Add to the OCDA Observe column for weighing" },
  { kind: "component_canon", label: "→ Component canon", hint: "Append to a component's brand canon / playbook" },
  { kind: "archive", label: "→ Archive", hint: "Soft-delete with reason" },
];
