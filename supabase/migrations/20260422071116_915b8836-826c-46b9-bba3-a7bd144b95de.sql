-- Spark provenance enum
DO $$ BEGIN
  CREATE TYPE public.spark_generator_kind AS ENUM ('system', 'agent', 'workflow');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add provenance columns to sparks
ALTER TABLE public.sparks
  ADD COLUMN IF NOT EXISTS generated_by_kind public.spark_generator_kind NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS generator_operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_event text;

-- Trigger: block direct human creation of sparks (must go through edge functions / service role)
CREATE OR REPLACE FUNCTION public.trg_spark_block_human_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow when role is service_role (edge functions / admin client)
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Allow when explicitly tagged as agent/workflow with an operator (admin tooling)
  IF NEW.generated_by_kind IN ('agent','workflow') AND NEW.generator_operator_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Sparks are system-generated only. Create a Quest or run a Curator to spawn Sparks.'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_spark_block_human_insert ON public.sparks;
CREATE TRIGGER trg_spark_block_human_insert
  BEFORE INSERT ON public.sparks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_spark_block_human_create();

-- Workflow x Relationship state-of-the-thing tracking
CREATE TABLE IF NOT EXISTS public.workflow_relationship_state (
  workflow_id uuid NOT NULL,
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  state_of_the_thing text NOT NULL DEFAULT 'Identified'
    CHECK (state_of_the_thing IN ('Identified','Defined','Designed','Built','Delivered','Adopted','Sustained')),
  source_of_advancement public.source_of_advancement,
  notes text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workflow_id, relationship_id)
);

ALTER TABLE public.workflow_relationship_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read workflow state"
  ON public.workflow_relationship_state FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team insert workflow state"
  ON public.workflow_relationship_state FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team update workflow state"
  ON public.workflow_relationship_state FOR UPDATE
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "admin delete workflow state"
  ON public.workflow_relationship_state FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_wrs_relationship ON public.workflow_relationship_state(relationship_id);
CREATE INDEX IF NOT EXISTS idx_sparks_generator ON public.sparks(generator_operator_id) WHERE generator_operator_id IS NOT NULL;