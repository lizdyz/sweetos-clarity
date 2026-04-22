
-- Quests: bring back the canonical Journey × Level-transition × Deliverable model
-- These are NEW columns; existing data is preserved.

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS from_level public.maturity_level,
  ADD COLUMN IF NOT EXISTS to_level public.maturity_level,
  ADD COLUMN IF NOT EXISTS deliverable_type text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS quest_number integer,
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'canonical',
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.quests(id) ON DELETE SET NULL;

-- kind: 'canonical' (the 20 user-journey templates), 'reflection' (the 8 internal "What is..." quests),
--       'instance' (a clone bound to a relationship), 'internal' (Liz's own work).
-- This separation matters: Quests for Liz's clients (canonical templates that advance journeys)
-- behave differently than Quests for Liz herself (reflection prompts on her own practice).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quests_kind_check'
  ) THEN
    ALTER TABLE public.quests
      ADD CONSTRAINT quests_kind_check
      CHECK (kind IN ('canonical','reflection','instance','internal'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quests_deliverable_type_check'
  ) THEN
    ALTER TABLE public.quests
      ADD CONSTRAINT quests_deliverable_type_check
      CHECK (
        deliverable_type IS NULL
        OR deliverable_type IN ('document','system','strategy','template','sop','tool','decision','reflection')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS quests_journey_template_idx
  ON public.quests (journey_id, is_template, quest_number);

CREATE INDEX IF NOT EXISTS quests_kind_idx ON public.quests (kind);
CREATE INDEX IF NOT EXISTS quests_template_id_idx ON public.quests (template_id);
