
DROP VIEW IF EXISTS public.workflow_step_pipeline;

ALTER TABLE public.workflow_steps
  ALTER COLUMN success_criteria DROP DEFAULT,
  ALTER COLUMN success_criteria TYPE text[]
  USING CASE
    WHEN success_criteria IS NULL OR trim(success_criteria) = '' THEN ARRAY[]::text[]
    ELSE string_to_array(success_criteria, E'\n')
  END;

ALTER TABLE public.workflow_steps
  ALTER COLUMN success_criteria SET DEFAULT ARRAY[]::text[];

UPDATE public.workflow_steps SET success_criteria = ARRAY[]::text[] WHERE success_criteria IS NULL;
ALTER TABLE public.workflow_steps ALTER COLUMN success_criteria SET NOT NULL;

ALTER TABLE public.workflow_steps
  ADD COLUMN IF NOT EXISTS deliverables text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE OR REPLACE VIEW public.workflow_step_pipeline AS
SELECT ws.id AS step_id,
       ws.workflow_id,
       ws."position",
       ws.name AS step_name,
       ws.step_type,
       ws.requires_human_approval,
       ws.approval_role,
       ws.default_operator_id,
       ws.tagged_components,
       ws.expected_duration_minutes,
       ws.success_criteria,
       ws.deliverables,
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

CREATE TABLE IF NOT EXISTS public.workflow_step_components (
  workflow_step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  contribution_type text NOT NULL DEFAULT 'advances',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workflow_step_id, component_id)
);

CREATE TABLE IF NOT EXISTS public.workflow_step_outcomes (
  workflow_step_id uuid NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES public.outcomes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workflow_step_id, outcome_id)
);

CREATE TABLE IF NOT EXISTS public.workflow_outcomes (
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES public.outcomes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workflow_id, outcome_id)
);

ALTER TABLE public.workflow_step_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_outcomes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_outcomes        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read step_components" ON public.workflow_step_components FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write step_components" ON public.workflow_step_components FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read step_outcomes" ON public.workflow_step_outcomes FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write step_outcomes" ON public.workflow_step_outcomes FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read workflow_outcomes" ON public.workflow_outcomes FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write workflow_outcomes" ON public.workflow_outcomes FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_wsc_step ON public.workflow_step_components(workflow_step_id);
CREATE INDEX IF NOT EXISTS idx_wsc_component ON public.workflow_step_components(component_id);
CREATE INDEX IF NOT EXISTS idx_wso_step ON public.workflow_step_outcomes(workflow_step_id);
CREATE INDEX IF NOT EXISTS idx_wso_outcome ON public.workflow_step_outcomes(outcome_id);
CREATE INDEX IF NOT EXISTS idx_wo_workflow ON public.workflow_outcomes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wo_outcome ON public.workflow_outcomes(outcome_id);
