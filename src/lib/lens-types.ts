export type LensSubjectKind =
  | "domain"
  | "tenet"
  | "component"
  | "relationship"
  | "mission"
  | "project";

export type LensTier = "canon" | "generated";

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
  /** present when tier === 'generated' */
  perspective?: LensPerspective | null;
  /** present when tier === 'canon' */
  canon?: LensCanon | null;
  quick_facts: string[];
  perspective_md: string | null;
  key_questions: string[];
  watch_outs: string[];
  next_actions: string[];
  stages_breakdown: LensStageBreakdown[];
}
