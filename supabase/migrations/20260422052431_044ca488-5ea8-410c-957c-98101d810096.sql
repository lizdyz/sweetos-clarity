
-- Service package enum
DO $$ BEGIN
  CREATE TYPE public.service_package AS ENUM ('Mirror Only', 'Mirror + Machine', 'Machine Only', 'Map', 'None');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.relationships
  ADD COLUMN IF NOT EXISTS service_package public.service_package,
  ADD COLUMN IF NOT EXISTS recommended_package public.service_package,
  ADD COLUMN IF NOT EXISTS recommendation_rationale text;

ALTER TABLE public.engagement_services
  ADD COLUMN IF NOT EXISTS target_completion_date date;

-- Sparks: only add if table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sparks') THEN
    EXECUTE 'ALTER TABLE public.sparks ADD COLUMN IF NOT EXISTS due_date date';
    EXECUTE 'ALTER TABLE public.sparks ADD COLUMN IF NOT EXISTS done_at timestamptz';
  END IF;
END $$;

ALTER TABLE public.outcomes
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS done_at timestamptz;

-- Checklist progress
CREATE TABLE IF NOT EXISTS public.excellence_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL,
  rubric_id uuid NOT NULL REFERENCES public.excellence_rubric(id) ON DELETE CASCADE,
  checklist_item_index integer NOT NULL,
  checked boolean NOT NULL DEFAULT true,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid DEFAULT auth.uid(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relationship_id, rubric_id, checklist_item_index)
);

ALTER TABLE public.excellence_checklist_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team read checklist progress" ON public.excellence_checklist_progress;
CREATE POLICY "team read checklist progress" ON public.excellence_checklist_progress
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "team insert checklist progress" ON public.excellence_checklist_progress;
CREATE POLICY "team insert checklist progress" ON public.excellence_checklist_progress
  FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "team update checklist progress" ON public.excellence_checklist_progress;
CREATE POLICY "team update checklist progress" ON public.excellence_checklist_progress
  FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "team delete checklist progress" ON public.excellence_checklist_progress;
CREATE POLICY "team delete checklist progress" ON public.excellence_checklist_progress
  FOR DELETE TO authenticated USING (public.is_team_member(auth.uid()));

DROP TRIGGER IF EXISTS set_excellence_checklist_progress_updated_at ON public.excellence_checklist_progress;
CREATE TRIGGER set_excellence_checklist_progress_updated_at
  BEFORE UPDATE ON public.excellence_checklist_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_checklist_progress_rel ON public.excellence_checklist_progress(relationship_id);
CREATE INDEX IF NOT EXISTS idx_checklist_progress_rubric ON public.excellence_checklist_progress(rubric_id);

-- Threshold progress view
CREATE OR REPLACE VIEW public.maturity_threshold_progress AS
SELECT
  r.subject_kind,
  r.subject_id,
  s.relationship_id,
  r.level AS current_level,
  r.id AS rubric_id,
  COALESCE(array_length(r.checklist_items, 1), 0) AS items_total_at_level,
  (SELECT count(*) FROM public.excellence_checklist_progress p
     WHERE p.rubric_id = r.id
       AND p.relationship_id = s.relationship_id
       AND p.checked = true) AS items_passed_at_level,
  (
    COALESCE(array_length(r.checklist_items, 1), 0) > 0
    AND (SELECT count(*) FROM public.excellence_checklist_progress p
           WHERE p.rubric_id = r.id
             AND p.relationship_id = s.relationship_id
             AND p.checked = true) >= COALESCE(array_length(r.checklist_items, 1), 0)
  ) AS ready_to_advance
FROM public.excellence_rubric r
LEFT JOIN public.excellence_scores s ON s.rubric_id = r.id;
