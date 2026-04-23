// Shared "Triageable" interface used by /sandbox, Sparks, KTI fires, inbound
// signals, and OCDA Observe lane. The contract: every triageable entity gets
// the same select → overlay → frame → promote gesture.

export type TriageKind =
  | "sandbox_item"
  | "spark"
  | "kti"
  | "task"
  | "decision_input"
  | "inbound_signal";

export type TriageState = "raw" | "framed" | "routed" | "archived" | "active";

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

export const OVERLAY_REGISTRY: { kind: OverlayKind; label: string; hint: string; v: 1 | 2 }[] = [
  { kind: "5ps", label: "5Ps", hint: "Which Ps does this touch? Where are the gaps?", v: 1 },
  { kind: "bizzybot_lens", label: "BizzyBot lens", hint: "Pick F1–F8 — generate a perspective with pros/cons/next questions", v: 1 },
  { kind: "kti_candidate", label: "KTI candidate", hint: "Could this become a forward-looking indicator? Draft a definition.", v: 1 },
  { kind: "domain_tenet_fit", label: "Domain / Tenet fit", hint: "Map to the 22 domains + active tenets.", v: 1 },
  { kind: "decision_readiness", label: "Decision-readiness", hint: "Framed question? Options weighed? Evidence attached? Confidence set?", v: 2 },
  { kind: "op_alpha", label: "Operational alpha", hint: "Where does it compound? Where does it leak?", v: 2 },
];

export const DEFAULT_PROMOTE_OPTIONS: PromoteAction[] = [
  { kind: "task", label: "→ Task", hint: "Create an executable task with provenance back here" },
  { kind: "project", label: "→ Project", hint: "Spawn a project with this idea as the brief" },
  { kind: "spark", label: "→ Spark", hint: "Convert to a system-attributed Spark" },
  { kind: "decision", label: "→ Decision", hint: "Log a formal Decision (status=decided) with provenance" },
  { kind: "decision_input", label: "→ Decision input", hint: "Add to the OCDA Observe column for weighing" },
  { kind: "component_canon", label: "→ Component canon", hint: "Append to a component's brand canon / playbook" },
  { kind: "archive", label: "→ Archive", hint: "Soft-delete with reason" },
];
