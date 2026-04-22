-- 1) Add scope + relationship anchor to quests
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS core_workflow_id uuid REFERENCES public.workflows(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.quests ADD CONSTRAINT quests_scope_check CHECK (scope IN ('client','internal'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Add scope + relationship anchor to sparks
ALTER TABLE public.sparks
  ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'client';

DO $$ BEGIN
  ALTER TABLE public.sparks ADD CONSTRAINT sparks_scope_check CHECK (scope IN ('client','internal'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Backfill: anything without a relationship is internal (Liz's own work)
UPDATE public.quests SET scope = 'internal' WHERE relationship_id IS NULL;
UPDATE public.sparks SET scope = 'internal' WHERE relationship_id IS NULL;

-- 4) Trigger: keep spark.scope/relationship_id in sync with parent quest
CREATE OR REPLACE FUNCTION public.trg_spark_inherit_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _q record;
BEGIN
  IF NEW.quest_id IS NOT NULL THEN
    SELECT scope, relationship_id INTO _q FROM public.quests WHERE id = NEW.quest_id;
    IF FOUND THEN
      NEW.scope := _q.scope;
      NEW.relationship_id := _q.relationship_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spark_inherit_scope ON public.sparks;
CREATE TRIGGER spark_inherit_scope
  BEFORE INSERT OR UPDATE OF quest_id ON public.sparks
  FOR EACH ROW EXECUTE FUNCTION public.trg_spark_inherit_scope();

-- 5) open_decisions table — honest tracker of unsettled architecture rules
CREATE TABLE IF NOT EXISTS public.open_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  area text NOT NULL,
  current_position text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','exploring','calibrating','settled')),
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.open_decisions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Team can view open decisions" ON public.open_decisions
    FOR SELECT USING (public.is_team_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Team can insert open decisions" ON public.open_decisions
    FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Team can update open decisions" ON public.open_decisions
    FOR UPDATE USING (public.is_team_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete open decisions" ON public.open_decisions
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS open_decisions_set_updated_at ON public.open_decisions;
CREATE TRIGGER open_decisions_set_updated_at
  BEFORE UPDATE ON public.open_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.open_decisions (title, area, current_position, status, sort_order)
VALUES
  ('Session ↔ Spark equivalency rules', 'Progression', 'Directionally clear; needs calibrated real-world rules.', 'calibrating', 10),
  ('Component maturity thresholds', 'Components', 'Living thresholds, not frozen. Update as evidence accrues.', 'exploring', 20),
  ('Evidence formalization timing', 'Truth model', 'Distributed today across sessions/sparks/notes. May graduate to a first-class entity later.', 'open', 30),
  ('Time decay / staleness rules', 'Confidence', 'Some truths age faster than others; rule unset.', 'open', 40),
  ('Which workflows are SweetSync-decomposable today', 'SweetSync', 'Treat as emerging from practice; do not assume universal coverage.', 'exploring', 50)
ON CONFLICT DO NOTHING;