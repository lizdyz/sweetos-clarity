-- Decision provenance
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS raised_from_kind text,
  ADD COLUMN IF NOT EXISTS raised_from_id uuid;

CREATE INDEX IF NOT EXISTS idx_decisions_raised_from
  ON public.decisions (raised_from_kind, raised_from_id)
  WHERE raised_from_kind IS NOT NULL;

-- Open decision → settled decision link
ALTER TABLE public.open_decisions
  ADD COLUMN IF NOT EXISTS settled_decision_id uuid REFERENCES public.decisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_open_decisions_settled
  ON public.open_decisions (settled_decision_id)
  WHERE settled_decision_id IS NOT NULL;