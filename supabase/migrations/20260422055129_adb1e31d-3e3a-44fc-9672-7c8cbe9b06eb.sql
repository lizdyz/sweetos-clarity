-- ============================================================================
-- Phase 2.10h: Measures + Workflow Steps + Session Templates
-- ============================================================================

-- ----- ENUMS ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.measure_kind AS ENUM ('Objective','KeyResult','KPI','CSF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.measure_subject_type AS ENUM (
    'operator','project','task','campaign','workflow','component',
    'relationship','mission','engagement_service'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.measure_direction AS ENUM ('higher_is_better','lower_is_better','hit_target');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.measure_cadence AS ENUM ('daily','weekly','monthly','quarterly','per_event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.measure_reading_source AS ENUM ('manual','session','workflow_run','agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_step_type AS ENUM ('action','gate','branch','sub_workflow');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_step_status AS ENUM (
    'pending','in_progress','awaiting_approval','approved','rejected','done','skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_role AS ENUM ('owner','admin','any_team_member','named_operator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- MEASURES -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.measure_kind NOT NULL DEFAULT 'KPI',
  subject_type public.measure_subject_type NOT NULL,
  subject_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  target_value numeric,
  target_unit text,
  baseline_value numeric,
  current_value numeric,
  direction public.measure_direction NOT NULL DEFAULT 'higher_is_better',
  cadence public.measure_cadence NOT NULL DEFAULT 'weekly',
  parent_measure_id uuid REFERENCES public.measures(id) ON DELETE SET NULL,
  due_date date,
  done_at timestamptz,
  status text,
  tagged_domains text[] NOT NULL DEFAULT '{}'::text[],
  tagged_tenets text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_measures_subject ON public.measures(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_measures_kind ON public.measures(kind);
CREATE INDEX IF NOT EXISTS idx_measures_parent ON public.measures(parent_measure_id);

ALTER TABLE public.measures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read measures" ON public.measures
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert measures" ON public.measures
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "owner or admin update measures" ON public.measures
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner or admin delete measures" ON public.measures
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER measures_set_updated_at
  BEFORE UPDATE ON public.measures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- MEASURE READINGS -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.measure_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measure_id uuid NOT NULL REFERENCES public.measures(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  notes text,
  source public.measure_reading_source NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_measure_readings_measure
  ON public.measure_readings(measure_id, recorded_at DESC);

ALTER TABLE public.measure_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read measure_readings" ON public.measure_readings
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert measure_readings" ON public.measure_readings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND recorded_by = auth.uid());
CREATE POLICY "owner or admin delete measure_readings" ON public.measure_readings
  FOR DELETE TO authenticated
  USING (recorded_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Trigger: keep current_value on measure in sync with latest reading
CREATE OR REPLACE FUNCTION public.trg_measure_reading_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.measures
  SET current_value = NEW.value,
      updated_at = now()
  WHERE id = NEW.measure_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS measure_reading_sync ON public.measure_readings;
CREATE TRIGGER measure_reading_sync
  AFTER INSERT ON public.measure_readings
  FOR EACH ROW EXECUTE FUNCTION public.trg_measure_reading_sync();

-- ----- VIEW: measure_health -------------------------------------------------
CREATE OR REPLACE VIEW public.measure_health AS
WITH latest AS (
  SELECT DISTINCT ON (measure_id)
    measure_id, value AS latest_value, recorded_at AS last_reading_at
  FROM public.measure_readings
  ORDER BY measure_id, recorded_at DESC
)
SELECT
  m.id AS measure_id,
  m.kind,
  m.subject_type,
  m.subject_id,
  m.name,
  m.target_value,
  m.baseline_value,
  m.direction,
  m.cadence,
  COALESCE(l.latest_value, m.current_value) AS latest_value,
  l.last_reading_at,
  CASE
    WHEN m.target_value IS NULL OR m.target_value = 0 THEN NULL
    WHEN m.direction = 'lower_is_better'
      THEN ROUND( (m.target_value / NULLIF(COALESCE(l.latest_value, m.current_value),0)) * 100, 1)
    ELSE ROUND( (COALESCE(l.latest_value, m.current_value) / NULLIF(m.target_value,0)) * 100, 1)
  END AS pct_to_target,
  CASE
    WHEN COALESCE(l.latest_value, m.current_value) IS NULL THEN 'gray'
    WHEN m.target_value IS NULL THEN 'gray'
    WHEN m.direction = 'lower_is_better' AND COALESCE(l.latest_value, m.current_value) <= m.target_value THEN 'green'
    WHEN m.direction = 'higher_is_better' AND COALESCE(l.latest_value, m.current_value) >= m.target_value THEN 'green'
    WHEN m.direction = 'hit_target'
      AND ABS(COALESCE(l.latest_value, m.current_value) - m.target_value) <= (m.target_value * 0.05) THEN 'green'
    WHEN m.direction = 'higher_is_better'
      AND COALESCE(l.latest_value, m.current_value) >= (m.target_value * 0.7) THEN 'amber'
    WHEN m.direction = 'lower_is_better'
      AND COALESCE(l.latest_value, m.current_value) <= (m.target_value * 1.3) THEN 'amber'
    ELSE 'red'
  END AS status_color
FROM public.measures m
LEFT JOIN latest l ON l.measure_id = m.id;

GRANT SELECT ON public.measure_health TO authenticated;

-- ============================================================================
-- WORKFLOW STEPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  position int NOT NULL DEFAULT 0,
  name text NOT NULL,
  description text,
  step_type public.workflow_step_type NOT NULL DEFAULT 'action',
  default_operator_id uuid,
  requires_human_approval boolean NOT NULL DEFAULT false,
  approval_role public.approval_role,
  tagged_components uuid[] NOT NULL DEFAULT '{}'::uuid[],
  produces_document_type text,
  expected_duration_minutes int,
  success_criteria text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow
  ON public.workflow_steps(workflow_id, position);

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read workflow_steps" ON public.workflow_steps
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert workflow_steps" ON public.workflow_steps
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "owner or admin update workflow_steps" ON public.workflow_steps
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner or admin delete workflow_steps" ON public.workflow_steps
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER workflow_steps_set_updated_at
  BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- WORKFLOW STEP DEPENDENCIES -------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_step_dependencies (
  step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  depends_on_step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  PRIMARY KEY (step_id, depends_on_step_id)
);

ALTER TABLE public.workflow_step_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read workflow_step_dependencies" ON public.workflow_step_dependencies
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write workflow_step_dependencies" ON public.workflow_step_dependencies
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- ----- WORKFLOW STEP RUNS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_step_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  status public.workflow_step_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  operator_id uuid,
  output_document_id uuid,
  notes text,
  approval_decision text,
  approval_by uuid,
  approval_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_run ON public.workflow_step_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_step ON public.workflow_step_runs(step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_status ON public.workflow_step_runs(status);

ALTER TABLE public.workflow_step_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read workflow_step_runs" ON public.workflow_step_runs
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert workflow_step_runs" ON public.workflow_step_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "team update workflow_step_runs" ON public.workflow_step_runs
  FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid()));
CREATE POLICY "owner or admin delete workflow_step_runs" ON public.workflow_step_runs
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER workflow_step_runs_set_updated_at
  BEFORE UPDATE ON public.workflow_step_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- workflow_runs additions ----------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='workflow_runs') THEN
    BEGIN
      ALTER TABLE public.workflow_runs ADD COLUMN IF NOT EXISTS current_step_id uuid;
      ALTER TABLE public.workflow_runs ADD COLUMN IF NOT EXISTS awaiting_approval_from uuid;
      ALTER TABLE public.workflow_runs ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- ----- VIEW: workflow_step_pipeline -----------------------------------------
CREATE OR REPLACE VIEW public.workflow_step_pipeline AS
SELECT
  ws.id AS step_id,
  ws.workflow_id,
  ws.position,
  ws.name AS step_name,
  ws.step_type,
  ws.requires_human_approval,
  ws.approval_role,
  ws.default_operator_id,
  ws.tagged_components,
  ws.expected_duration_minutes,
  ws.success_criteria,
  wsr.id AS step_run_id,
  wsr.run_id,
  wsr.status AS run_status,
  wsr.started_at,
  wsr.completed_at,
  wsr.operator_id AS actual_operator_id,
  wsr.output_document_id,
  wsr.approval_by,
  wsr.approval_at,
  wsr.approval_decision
FROM public.workflow_steps ws
LEFT JOIN public.workflow_step_runs wsr ON wsr.step_id = ws.id;

GRANT SELECT ON public.workflow_step_pipeline TO authenticated;

-- ============================================================================
-- SESSION TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  service_type text,
  default_duration_minutes int NOT NULL DEFAULT 60,
  default_phase_owner public.phase_owner,
  default_sweetcycle_phase public.sweetcycle_phase,
  linked_workflow_id uuid,
  default_components uuid[] NOT NULL DEFAULT '{}'::uuid[],
  default_deliverable_template_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  prep_checklist text[] NOT NULL DEFAULT '{}'::text[],
  agenda text[] NOT NULL DEFAULT '{}'::text[],
  closing_checklist text[] NOT NULL DEFAULT '{}'::text[],
  typical_position_in_journey int,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_session_templates_service
  ON public.session_templates(service_type);

ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read session_templates" ON public.session_templates
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert session_templates" ON public.session_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "owner or admin update session_templates" ON public.session_templates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owner or admin delete session_templates" ON public.session_templates
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER session_templates_set_updated_at
  BEFORE UPDATE ON public.session_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- sessions table addition (only if exists) -----------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='sessions') THEN
    BEGIN
      ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_template_id uuid
        REFERENCES public.session_templates(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;
