
-- =========================================================
-- Enums
-- =========================================================
CREATE TYPE public.proposal_status AS ENUM ('pending', 'approved', 'rejected', 'held', 'merged');
CREATE TYPE public.proposal_source AS ENUM ('capture', 'notion', 'external_ai', 'manual');
CREATE TYPE public.proposal_entity_type AS ENUM (
  'persona', 'relationship', 'campaign', 'project', 'task',
  'session', 'document', 'decision', 'spark', 'quest',
  'component', 'workflow', 'journey', 'mission', 'outcome',
  'domain_assessment', 'delegation', 'playbook'
);

-- =========================================================
-- proposals — staging queue for every input rail
-- =========================================================
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.proposal_entity_type NOT NULL,
  status public.proposal_status NOT NULL DEFAULT 'pending',
  source public.proposal_source NOT NULL,
  source_ref text,
  source_label text,
  raw_input text,
  proposed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_record_id uuid,
  matched_record_table text,
  confidence numeric(3,2),
  conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_model text,
  ai_notes text,
  written_record_id uuid,
  written_record_table text,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_entity_type ON public.proposals(entity_type);
CREATE INDEX idx_proposals_source ON public.proposals(source);
CREATE UNIQUE INDEX uq_proposals_source_ref
  ON public.proposals(source, source_ref)
  WHERE source_ref IS NOT NULL;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read" ON public.proposals
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team insert" ON public.proposals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "owner or admin update" ON public.proposals
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "owner or admin delete" ON public.proposals
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- sources — Notion pages/databases mapped to SweetBOS entities
-- =========================================================
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'notion',
  external_id text NOT NULL,
  external_url text,
  entity_type public.proposal_entity_type NOT NULL,
  notes text,
  last_pulled_at timestamptz,
  last_pull_status text,
  last_pull_count integer DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind, external_id)
);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read" ON public.sources
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team insert" ON public.sources
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "owner or admin update" ON public.sources
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "owner or admin delete" ON public.sources
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_sources_updated_at
  BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- persona_templates — starter persona shapes per industry
-- =========================================================
CREATE TABLE public.persona_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  name text NOT NULL,
  description text,
  suggested_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_persona_templates_industry ON public.persona_templates(industry);

ALTER TABLE public.persona_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read" ON public.persona_templates
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "admins manage templates" ON public.persona_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_persona_templates_updated_at
  BEFORE UPDATE ON public.persona_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Industry on relationships
-- =========================================================
ALTER TABLE public.relationships ADD COLUMN IF NOT EXISTS industry text;

-- =========================================================
-- Provenance on key entities
-- =========================================================
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS source public.proposal_source DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

ALTER TABLE public.relationships
  ADD COLUMN IF NOT EXISTS source public.proposal_source DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS source public.proposal_source DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS source public.proposal_source DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source public.proposal_source DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;
