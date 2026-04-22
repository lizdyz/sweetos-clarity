export type LensSubjectKind =
  | "domain"
  | "tenet"
  | "component"
  | "relationship"
  | "mission"
  | "project";

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
  generated_at: string;
  generated_by_model: string | null;
  version: number;
  is_pinned: boolean;
}
