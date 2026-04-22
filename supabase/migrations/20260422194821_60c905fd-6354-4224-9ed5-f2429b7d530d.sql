-- 1. lens_canon table
CREATE TABLE public.lens_canon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_id uuid NOT NULL REFERENCES public.lenses(id) ON DELETE CASCADE,
  subject_kind text NOT NULL,
  subject_id uuid NOT NULL,
  quick_facts text[] NOT NULL DEFAULT '{}',
  perspective_md text,
  key_questions text[] NOT NULL DEFAULT '{}',
  watch_outs text[] NOT NULL DEFAULT '{}',
  next_actions text[] NOT NULL DEFAULT '{}',
  stages_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'curated' CHECK (source IN ('curated','promoted_from_ai')),
  promoted_from_perspective_id uuid REFERENCES public.lens_perspectives(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','retired')),
  notes text,
  updated_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lens_id, subject_kind, subject_id)
);

CREATE INDEX idx_lens_canon_lookup ON public.lens_canon (subject_kind, subject_id, status);
CREATE INDEX idx_lens_canon_lens ON public.lens_canon (lens_id);

ALTER TABLE public.lens_canon ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view lens_canon"
  ON public.lens_canon FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert lens_canon"
  ON public.lens_canon FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can update lens_canon"
  ON public.lens_canon FOR UPDATE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can delete lens_canon"
  ON public.lens_canon FOR DELETE
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_lens_canon_updated_at
  BEFORE UPDATE ON public.lens_canon
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. tier column on lens_perspectives
ALTER TABLE public.lens_perspectives
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'generated'
  CHECK (tier IN ('canon','generated'));

UPDATE public.lens_perspectives SET tier = 'generated' WHERE tier IS NULL;