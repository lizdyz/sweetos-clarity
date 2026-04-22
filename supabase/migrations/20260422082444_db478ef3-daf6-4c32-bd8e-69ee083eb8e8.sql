-- 1. Brand canon (per relationship, optional per component)
CREATE TABLE public.narrative_brand_canon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid REFERENCES public.relationships(id) ON DELETE CASCADE,
  component_id uuid REFERENCES public.components(id) ON DELETE CASCADE,
  name text NOT NULL,
  voice_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  visual_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  protagonist_anchors jsonb NOT NULL DEFAULT '[]'::jsonb,
  world_anchors jsonb NOT NULL DEFAULT '[]'::jsonb,
  narrative_pillars text[] NOT NULL DEFAULT ARRAY[]::text[],
  vault_source_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  forbidden_visuals text[] NOT NULL DEFAULT ARRAY[]::text[],
  forbidden_phrases text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (relationship_id IS NOT NULL OR component_id IS NOT NULL)
);

CREATE INDEX idx_narrative_brand_canon_relationship ON public.narrative_brand_canon(relationship_id);
CREATE INDEX idx_narrative_brand_canon_component ON public.narrative_brand_canon(component_id);

ALTER TABLE public.narrative_brand_canon ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can read brand canon" ON public.narrative_brand_canon
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can insert brand canon" ON public.narrative_brand_canon
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team can update brand canon" ON public.narrative_brand_canon
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can delete brand canon" ON public.narrative_brand_canon
  FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_narrative_brand_canon_updated_at
  BEFORE UPDATE ON public.narrative_brand_canon
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Format specs (seeded library)
CREATE TABLE public.narrative_format_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  output_kind text NOT NULL,
  panel_count int NOT NULL,
  narrative_arc text[] NOT NULL,
  dialogue_density text NOT NULL DEFAULT 'medium',
  required_canon_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  optional_canon_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.narrative_format_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can read format specs" ON public.narrative_format_specs
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "admins can insert format specs" ON public.narrative_format_specs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can update format specs" ON public.narrative_format_specs
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete format specs" ON public.narrative_format_specs
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_narrative_format_specs_updated_at
  BEFORE UPDATE ON public.narrative_format_specs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed 6 format recipes
INSERT INTO public.narrative_format_specs (code, name, description, output_kind, panel_count, narrative_arc, dialogue_density, required_canon_fields, optional_canon_fields, sort_order) VALUES
  ('founder_origin', 'Founder Origin', 'Why this person started this thing. The arc that earned the trust.', 'narrative_founder', 6, ARRAY['spark','struggle','choice','climb','present','invitation'], 'low', ARRAY['voice_attributes','protagonist_anchors','narrative_pillars'], ARRAY['world_anchors'], 1),
  ('client_onboarding', 'Client Onboarding Story', 'The first four moments — meeting, diagnosis, plan, first win.', 'narrative_onboarding', 4, ARRAY['meeting','diagnosis','plan','first_win'], 'medium', ARRAY['voice_attributes','protagonist_anchors'], ARRAY['narrative_pillars'], 2),
  ('segment_archetype', 'Segment Archetype Vignette', 'A day in the life of one segment — tension to relief.', 'narrative_archetype', 3, ARRAY['day_in_life','tension','relief'], 'low', ARRAY['voice_attributes'], ARRAY['protagonist_anchors','world_anchors'], 3),
  ('capability_explainer', 'IP / Capability Explainer', 'Problem → wrong path → insight → method → proof.', 'narrative_explainer', 5, ARRAY['problem','wrong_path','insight','method','proof'], 'medium', ARRAY['voice_attributes','narrative_pillars'], ARRAY['protagonist_anchors'], 4),
  ('sales_narrative', 'Sales Narrative', 'Prospect world → trigger → bridge → after.', 'narrative_sales', 4, ARRAY['prospect_world','trigger','bridge','after'], 'medium', ARRAY['voice_attributes','narrative_pillars'], ARRAY['protagonist_anchors'], 5),
  ('training_comic', 'Training Comic', 'Scenario-driven 8-panel learning piece.', 'narrative_training', 8, ARRAY['setup','attempt','complication','reflection','principle','reattempt','outcome','takeaway'], 'high', ARRAY['voice_attributes','protagonist_anchors'], ARRAY['narrative_pillars','world_anchors'], 6);

-- 3. Narrative drafts (staging before illustration + publish)
CREATE TABLE public.narrative_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_canon_id uuid NOT NULL REFERENCES public.narrative_brand_canon(id) ON DELETE CASCADE,
  format_spec_id uuid NOT NULL REFERENCES public.narrative_format_specs(id),
  relationship_id uuid REFERENCES public.relationships(id) ON DELETE SET NULL,
  component_id uuid REFERENCES public.components(id) ON DELETE SET NULL,
  audience text,
  user_prompt text NOT NULL,
  panels jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric,
  fidelity_flags text[] NOT NULL DEFAULT ARRAY[]::text[],
  quality_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  generated_by_model text,
  approved_at timestamptz,
  approved_by uuid,
  published_output_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_narrative_drafts_canon ON public.narrative_drafts(brand_canon_id);
CREATE INDEX idx_narrative_drafts_status ON public.narrative_drafts(status);

ALTER TABLE public.narrative_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can read drafts" ON public.narrative_drafts
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can insert drafts" ON public.narrative_drafts
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team can update drafts" ON public.narrative_drafts
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can delete drafts" ON public.narrative_drafts
  FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_narrative_drafts_updated_at
  BEFORE UPDATE ON public.narrative_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Distill proposals (Vault → canon proposals awaiting review)
CREATE TABLE public.narrative_distill_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_canon_id uuid REFERENCES public.narrative_brand_canon(id) ON DELETE CASCADE,
  relationship_id uuid REFERENCES public.relationships(id) ON DELETE CASCADE,
  component_id uuid REFERENCES public.components(id) ON DELETE CASCADE,
  vault_source_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  proposed jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text,
  status text NOT NULL DEFAULT 'pending',
  generated_by_model text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_distill_proposals_canon ON public.narrative_distill_proposals(brand_canon_id);
CREATE INDEX idx_distill_proposals_status ON public.narrative_distill_proposals(status);

ALTER TABLE public.narrative_distill_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can read distill proposals" ON public.narrative_distill_proposals
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can insert distill proposals" ON public.narrative_distill_proposals
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team can update distill proposals" ON public.narrative_distill_proposals
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can delete distill proposals" ON public.narrative_distill_proposals
  FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_distill_proposals_updated_at
  BEFORE UPDATE ON public.narrative_distill_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Extend component_outputs with narrative columns
ALTER TABLE public.component_outputs
  ADD COLUMN IF NOT EXISTS narrative_panels jsonb,
  ADD COLUMN IF NOT EXISTS brand_canon_snapshot jsonb;