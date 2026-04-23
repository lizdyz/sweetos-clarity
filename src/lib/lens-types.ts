export type LensSubjectKind =
  | "domain"
  | "tenet"
  | "component"
  | "relationship"
  | "mission"
  | "project";

export type LensTier = "canon" | "generated";

/** Every kind of object that can be interrogated with a lens. */
export type ObjectKind =
  | "task"
  | "project"
  | "decision"
  | "spark"
  | "quest"
  | "mission"
  | "journey"
  | "engagement_plan"
  | "session"
  | "relationship"
  | "component"
  | "tenet"
  | "domain"
  | "persona"
  | "jtbd"
  | "kti"
  | "sandbox_item"
  | "inbound_signal"
  | "outcome"
  | "measure"
  | "workflow";

export type LensFit = "suggested" | "optional" | "low_value";

export type LensOutputKind =
  | "observation"
  | "choice"
  | "decision"
  | "action"
  | "task"
  | "opportunity"
  | "risk"
  | "prompt"
  | "workflow_step"
  | "assignment"
  | "linked_idea";

export type LensOutputStatus = "open" | "accepted" | "dismissed" | "promoted";

export interface Lens {
  id: string;
  code: string;
  name: string;
  tagline: string;
  what_it_asks: string | null;
  best_use: string | null;
  stages: string[];
  bizzybot_emoji: string | null;
  icon_key: string | null;
  accent_color: string;
  sort_order: number;
  system_prompt?: string | null;
  user_prompt_template?: string | null;
  model?: string | null;
  // Wave 21 additions
  purpose?: string | null;
  core_intention?: string | null;
  when_to_use?: string | null;
  when_not_to_use?: string | null;
  output_kinds?: LensOutputKind[] | null;
  display_priority?: number | null;
  kind?: "framework" | "persona" | "hybrid" | null;
  active?: boolean | null;
}

export interface LensObjectFit {
  id: string;
  lens_id: string;
  object_kind: ObjectKind;
  fit: LensFit;
  priority: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LensOutput {
  id: string;
  lens_id: string;
  perspective_id: string | null;
  source_kind: ObjectKind;
  source_id: string;
  kind: LensOutputKind;
  title: string;
  body: string | null;
  target_kind: string | null;
  target_id: string | null;
  status: LensOutputStatus;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LensStageBreakdown {
  stage: string;
  summary: string;
  bullets: string[];
  watch_outs: string[];
  next_actions: string[];
}

export interface LensPerspective {
  id: string;
  lens_id: string;
  subject_kind: LensSubjectKind;
  subject_id: string;
  quick_facts: string[];
  perspective_md: string | null;
  key_questions: string[];
  watch_outs: string[];
  next_actions: string[];
  stages_breakdown: LensStageBreakdown[];
  generated_at: string;
  generated_by_model: string | null;
  version: number;
  is_pinned: boolean;
  tier?: LensTier;
}

export interface LensCanon {
  id: string;
  lens_id: string;
  subject_kind: LensSubjectKind;
  subject_id: string;
  quick_facts: string[];
  perspective_md: string | null;
  key_questions: string[];
  watch_outs: string[];
  next_actions: string[];
  stages_breakdown: LensStageBreakdown[];
  source: "curated" | "promoted_from_ai";
  promoted_from_perspective_id: string | null;
  status: "active" | "draft" | "retired";
  notes: string | null;
  updated_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Unified shape so the LensPerspectiveCard can render either tier. */
export interface LensCardEntry {
  tier: LensTier;
  perspective?: LensPerspective | null;
  canon?: LensCanon | null;
  quick_facts: string[];
  perspective_md: string | null;
  key_questions: string[];
  watch_outs: string[];
  next_actions: string[];
  stages_breakdown: LensStageBreakdown[];
}

export const ALL_OBJECT_KINDS: ObjectKind[] = [
  "task",
  "project",
  "decision",
  "spark",
  "quest",
  "mission",
  "journey",
  "engagement_plan",
  "session",
  "relationship",
  "component",
  "tenet",
  "domain",
  "persona",
  "jtbd",
  "kti",
  "sandbox_item",
  "inbound_signal",
  "outcome",
  "measure",
  "workflow",
];

export const OBJECT_KIND_LABELS: Record<ObjectKind, string> = {
  task: "Task",
  project: "Project",
  decision: "Decision",
  spark: "Spark",
  quest: "Quest",
  mission: "Mission",
  journey: "Journey",
  engagement_plan: "Engagement Plan",
  session: "Session",
  relationship: "Relationship",
  component: "Component",
  tenet: "Tenet",
  domain: "Domain",
  persona: "Persona",
  jtbd: "JTBD",
  kti: "KTI",
  sandbox_item: "Sandbox item",
  inbound_signal: "Inbound signal",
  outcome: "Outcome",
  measure: "Measure",
  workflow: "Workflow",
};

export const OUTPUT_KIND_LABELS: Record<LensOutputKind, string> = {
  observation: "Observation",
  choice: "Choice",
  decision: "Decision",
  action: "Action",
  task: "Task",
  opportunity: "Opportunity",
  risk: "Risk",
  prompt: "Prompt",
  workflow_step: "Workflow step",
  assignment: "Assignment",
  linked_idea: "Linked idea",
};
