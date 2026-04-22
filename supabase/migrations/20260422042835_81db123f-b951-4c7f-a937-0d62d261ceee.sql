
-- Phase 2.8 — Reconcile audit + Engagement Plans + Maturity rollup + Funnel

-- ENUMS
DO $$ BEGIN CREATE TYPE public.awareness_tier AS ENUM ('Unaware','Problem-aware','Solution-aware','Product-aware','Most-aware'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.relationship_temperature AS ENUM ('Warm','Cool','Cold','Paused'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.drift_risk AS ENUM ('None','Low','Medium','High'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.engagement_plan_status AS ENUM ('Proposed','Accepted','In Progress','Completed','Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.engagement_service_type AS ENUM ('Mirror','Map','Machine','SweetSync','SweetConnect'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.engagement_service_status AS ENUM ('Not Started','Active','Paused','Completed','Renewed','Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.session_phase AS ENUM ('Pre-Engagement','Deliverable','Follow-up'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.reusability_tier AS ENUM ('One-Time','Relationship','Org','System'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Funnel fields on relationships
ALTER TABLE public.relationships
  ADD COLUMN IF NOT EXISTS awareness_tier public.awareness_tier,
  ADD COLUMN IF NOT EXISTS temperature public.relationship_temperature,
  ADD COLUMN IF NOT EXISTS drift_risk public.drift_risk,
  ADD COLUMN IF NOT EXISTS proposal_document_id uuid,
  ADD COLUMN IF NOT EXISTS proposal_sent_at date,
  ADD COLUMN IF NOT EXISTS proposal_expires_at date,
  ADD COLUMN IF NOT EXISTS proposal_version text,
  ADD COLUMN IF NOT EXISTS service_start_date date,
  ADD COLUMN IF NOT EXISTS service_end_date date,
  ADD COLUMN IF NOT EXISTS primary_service public.engagement_service_type,
  ADD COLUMN IF NOT EXISTS service_status public.engagement_service_status;

DO $$ BEGIN
  ALTER TABLE public.relationships
    ADD CONSTRAINT relationships_proposal_document_fk
    FOREIGN KEY (proposal_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- engagement_plans
CREATE TABLE IF NOT EXISTS public.engagement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  status public.engagement_plan_status NOT NULL DEFAULT 'Proposed',
  start_date date,
  end_date date,
  total_revenue_usd numeric,
  map_roadmap text,
  machine_roadmap text,
  expected_domains text[] NOT NULL DEFAULT '{}',
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.engagement_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team read" ON public.engagement_plans;
DROP POLICY IF EXISTS "team insert" ON public.engagement_plans;
DROP POLICY IF EXISTS "owner or admin update" ON public.engagement_plans;
DROP POLICY IF EXISTS "owner or admin delete" ON public.engagement_plans;
CREATE POLICY "team read" ON public.engagement_plans FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
CREATE POLICY "team insert" ON public.engagement_plans FOR INSERT TO authenticated WITH CHECK (is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "owner or admin update" ON public.engagement_plans FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner or admin delete" ON public.engagement_plans FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
DROP TRIGGER IF EXISTS set_engagement_plans_updated_at ON public.engagement_plans;
CREATE TRIGGER set_engagement_plans_updated_at BEFORE UPDATE ON public.engagement_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_engagement_plans_relationship ON public.engagement_plans(relationship_id);

-- engagement_services
CREATE TABLE IF NOT EXISTS public.engagement_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.engagement_plans(id) ON DELETE SET NULL,
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  service_type public.engagement_service_type NOT NULL,
  start_date date,
  end_date date,
  status public.engagement_service_status NOT NULL DEFAULT 'Not Started',
  total_value_usd numeric,
  sessions_purchased integer,
  sessions_used integer DEFAULT 0,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.engagement_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team read" ON public.engagement_services;
DROP POLICY IF EXISTS "team insert" ON public.engagement_services;
DROP POLICY IF EXISTS "owner or admin update" ON public.engagement_services;
DROP POLICY IF EXISTS "owner or admin delete" ON public.engagement_services;
CREATE POLICY "team read" ON public.engagement_services FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
CREATE POLICY "team insert" ON public.engagement_services FOR INSERT TO authenticated WITH CHECK (is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "owner or admin update" ON public.engagement_services FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner or admin delete" ON public.engagement_services FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
DROP TRIGGER IF EXISTS set_engagement_services_updated_at ON public.engagement_services;
CREATE TRIGGER set_engagement_services_updated_at BEFORE UPDATE ON public.engagement_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_engagement_services_plan ON public.engagement_services(plan_id);
CREATE INDEX IF NOT EXISTS idx_engagement_services_relationship ON public.engagement_services(relationship_id);

-- Sessions ladder up to a plan + audit fields
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS engagement_plan_id uuid,
  ADD COLUMN IF NOT EXISTS sequence integer,
  ADD COLUMN IF NOT EXISTS domain_covered text,
  ADD COLUMN IF NOT EXISTS outcome_findings text,
  ADD COLUMN IF NOT EXISTS maturity_lift_from public.maturity_level,
  ADD COLUMN IF NOT EXISTS maturity_lift_to public.maturity_level;

DO $$ BEGIN
  ALTER TABLE public.sessions
    ADD CONSTRAINT sessions_engagement_plan_fk
    FOREIGN KEY (engagement_plan_id) REFERENCES public.engagement_plans(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Components audit fields
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS questions_it_answers text,
  ADD COLUMN IF NOT EXISTS typical_session_length text,
  ADD COLUMN IF NOT EXISTS prerequisite_component_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS used_in_offerings text[] NOT NULL DEFAULT '{}';

-- Documents audit fields
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS related_session_id uuid,
  ADD COLUMN IF NOT EXISTS session_phase public.session_phase,
  ADD COLUMN IF NOT EXISTS component_template_for uuid,
  ADD COLUMN IF NOT EXISTS reusability_tier public.reusability_tier;

DO $$ BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_related_session_fk
    FOREIGN KEY (related_session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_component_template_fk
    FOREIGN KEY (component_template_for) REFERENCES public.components(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Maturity rollup view
CREATE OR REPLACE VIEW public.relationship_domain_maturity
WITH (security_invoker = true) AS
WITH met_scores AS (
  SELECT
    es.relationship_id,
    er.subject_id AS domain_id,
    er.level,
    es.assessed_at,
    es.id AS score_id
  FROM public.excellence_scores es
  JOIN public.excellence_rubric er ON er.id = es.rubric_id
  WHERE er.subject_kind = 'domain' AND es.state = 'met'
),
ranked AS (
  SELECT
    relationship_id, domain_id, level, assessed_at, score_id,
    ROW_NUMBER() OVER (PARTITION BY relationship_id, domain_id ORDER BY level DESC, assessed_at DESC) AS rn
  FROM met_scores
)
SELECT
  r.relationship_id,
  d.id AS domain_id,
  d.slug AS domain_slug,
  d.name AS domain_name,
  r.level AS current_level,
  r.assessed_at AS last_assessed_at,
  r.score_id AS last_score_id
FROM ranked r
JOIN public.domains d ON d.id = r.domain_id
WHERE r.rn = 1;

GRANT SELECT ON public.relationship_domain_maturity TO authenticated;
