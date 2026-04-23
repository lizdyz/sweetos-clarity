-- Wave 16: Workflow execution adapters

-- 1. Add execution_kind to workflows
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS execution_kind text NOT NULL DEFAULT 'native'
    CHECK (execution_kind IN ('native','n8n','make','zapier'));

-- 2. Add external_run_id to workflow_runs
ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS external_run_id text;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_external_run_id
  ON public.workflow_runs(external_run_id)
  WHERE external_run_id IS NOT NULL;

-- 3. Add external_step_id to workflow_step_runs
ALTER TABLE public.workflow_step_runs
  ADD COLUMN IF NOT EXISTS external_step_id text;

CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_external_step_id
  ON public.workflow_step_runs(external_step_id)
  WHERE external_step_id IS NOT NULL;

-- 4. Bindings table
CREATE TABLE IF NOT EXISTS public.workflow_execution_bindings (
  workflow_id uuid PRIMARY KEY REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_kind text NOT NULL DEFAULT 'native'
    CHECK (execution_kind IN ('native','n8n','make','zapier')),
  trigger_url text,
  callback_secret text,
  external_id text,
  field_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.workflow_execution_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can read workflow execution bindings"
  ON public.workflow_execution_bindings FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can insert workflow execution bindings"
  ON public.workflow_execution_bindings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team can update workflow execution bindings"
  ON public.workflow_execution_bindings FOR UPDATE
  TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team can delete workflow execution bindings"
  ON public.workflow_execution_bindings FOR DELETE
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_workflow_execution_bindings_updated_at
  BEFORE UPDATE ON public.workflow_execution_bindings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Backfill: every existing workflow gets execution_kind='native' (already default, but ensure no nulls)
UPDATE public.workflows SET execution_kind = 'native' WHERE execution_kind IS NULL;