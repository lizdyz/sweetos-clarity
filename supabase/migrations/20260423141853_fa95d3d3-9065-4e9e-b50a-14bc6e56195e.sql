-- 1. Extend lenses table
ALTER TABLE public.lenses
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS core_intention text,
  ADD COLUMN IF NOT EXISTS when_to_use text,
  ADD COLUMN IF NOT EXISTS when_not_to_use text,
  ADD COLUMN IF NOT EXISTS output_kinds text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS display_priority int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'framework',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 2. lens_object_fit
CREATE TABLE IF NOT EXISTS public.lens_object_fit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_id uuid NOT NULL REFERENCES public.lenses(id) ON DELETE CASCADE,
  object_kind text NOT NULL,
  fit text NOT NULL DEFAULT 'optional' CHECK (fit IN ('suggested','optional','low_value')),
  priority int NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lens_id, object_kind)
);

CREATE INDEX IF NOT EXISTS idx_lens_object_fit_object_kind ON public.lens_object_fit(object_kind);
CREATE INDEX IF NOT EXISTS idx_lens_object_fit_lens ON public.lens_object_fit(lens_id);

ALTER TABLE public.lens_object_fit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view lens_object_fit"
  ON public.lens_object_fit FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can insert lens_object_fit"
  ON public.lens_object_fit FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team can update lens_object_fit"
  ON public.lens_object_fit FOR UPDATE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can delete lens_object_fit"
  ON public.lens_object_fit FOR DELETE
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_lens_object_fit_updated_at
  BEFORE UPDATE ON public.lens_object_fit
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. lens_outputs
CREATE TABLE IF NOT EXISTS public.lens_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_id uuid NOT NULL REFERENCES public.lenses(id) ON DELETE CASCADE,
  perspective_id uuid REFERENCES public.lens_perspectives(id) ON DELETE SET NULL,
  source_kind text NOT NULL,
  source_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN (
    'observation','choice','decision','action','task','opportunity',
    'risk','prompt','workflow_step','assignment','linked_idea'
  )),
  title text NOT NULL,
  body text,
  target_kind text,
  target_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','dismissed','promoted')),
  priority int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lens_outputs_source ON public.lens_outputs(source_kind, source_id);
CREATE INDEX IF NOT EXISTS idx_lens_outputs_lens ON public.lens_outputs(lens_id);
CREATE INDEX IF NOT EXISTS idx_lens_outputs_status ON public.lens_outputs(status);

ALTER TABLE public.lens_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view lens_outputs"
  ON public.lens_outputs FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can insert lens_outputs"
  ON public.lens_outputs FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team can update lens_outputs"
  ON public.lens_outputs FOR UPDATE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can delete lens_outputs"
  ON public.lens_outputs FOR DELETE
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_lens_outputs_updated_at
  BEFORE UPDATE ON public.lens_outputs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Seed F10/F11/F12 lenses
INSERT INTO public.lenses (code, name, tagline, what_it_asks, best_use, stages, bizzybot_emoji, accent_color, sort_order, kind, purpose, core_intention, when_to_use, when_not_to_use, output_kinds, display_priority, active)
VALUES
  ('F10', 'KTI Candidate', 'Could this become a forward-looking indicator?',
   'Is there a measurable leading signal here? What would the threshold be?',
   'Use when an observation feels like it could repeat and be tracked.',
   ARRAY['signal','threshold','cadence','action']::text[],
   '📡', '#7c3aed', 100, 'framework',
   'Turns a recurring observation into a measurable Key Trend Indicator with a defined signal, threshold, and trigger.',
   'A trackable forward-looking metric with a clear firing condition.',
   'When you suspect a pattern that should drive automatic action.',
   'When the signal is one-off or not measurable.',
   ARRAY['observation','prompt','action']::text[],
   100, true),
  ('F11', 'Decision Readiness', 'Are we ready to decide?',
   'Is the question framed? Are options weighed? Is evidence attached? Is confidence set?',
   'Use before promoting an input to a Decision.',
   ARRAY['frame','options','evidence','confidence']::text[],
   '🛡️', '#0891b2', 110, 'framework',
   'Audits whether a decision is actually ready to be made — frame, options, evidence, confidence.',
   'A go/no-go on whether this can be decided now.',
   'Before settling an Open Decision or moving from Choose to Decide in OCDA.',
   'During pure exploration — too early.',
   ARRAY['observation','choice','risk','action']::text[],
   110, true),
  ('F12', 'Operational Alpha', 'Where does it compound? Where does it leak?',
   'What gets better with reuse? What erodes value silently?',
   'Use on processes, components, and recurring work.',
   ARRAY['compounding','leakage','leverage']::text[],
   '⚡', '#f59e0b', 120, 'framework',
   'Surfaces compounding upside and silent leakage in operational work.',
   'A list of compounding levers and silent leaks.',
   'On recurring processes, workflows, components.',
   'On one-off creative work.',
   ARRAY['observation','opportunity','risk','action']::text[],
   120, true)
ON CONFLICT (code) DO NOTHING;

-- 5. Backfill purpose / core_intention for existing F1–F9 if empty
UPDATE public.lenses SET
  purpose = COALESCE(NULLIF(purpose,''), tagline),
  core_intention = COALESCE(NULLIF(core_intention,''), what_it_asks),
  when_to_use = COALESCE(NULLIF(when_to_use,''), best_use),
  output_kinds = CASE WHEN array_length(output_kinds,1) IS NULL
    THEN ARRAY['observation','action']::text[] ELSE output_kinds END
WHERE purpose IS NULL OR core_intention IS NULL OR array_length(output_kinds,1) IS NULL;

-- 6. Seed default object_fit recommendations
WITH defaults(code, object_kind, fit, priority) AS (
  VALUES
    -- F1 OCDA — decision pipeline
    ('F1','decision','suggested',100),
    ('F1','sandbox_item','suggested',95),
    ('F1','spark','suggested',90),
    ('F1','task','optional',50),
    ('F1','project','optional',50),
    -- F2 Gestalt — wholeness
    ('F2','project','suggested',80),
    ('F2','engagement_plan','suggested',80),
    ('F2','journey','suggested',80),
    ('F2','relationship','optional',60),
    -- F3 4Ds — discover/define/develop/deliver
    ('F3','project','suggested',85),
    ('F3','quest','suggested',85),
    ('F3','mission','optional',60),
    -- F4 5Ps — purpose/people/process/product/profit
    ('F4','project','suggested',95),
    ('F4','relationship','suggested',90),
    ('F4','engagement_plan','suggested',90),
    ('F4','mission','suggested',85),
    ('F4','task','low_value',10),
    -- F5 3Cs — context, content, conduct
    ('F5','session','suggested',85),
    ('F5','component','suggested',80),
    ('F5','persona','optional',60),
    -- F6 5Ls — listen/learn/etc
    ('F6','relationship','suggested',85),
    ('F6','session','suggested',80),
    ('F6','jtbd','optional',60),
    -- F7 Co-Evolution
    ('F7','relationship','suggested',80),
    ('F7','journey','suggested',80),
    -- F8 Rhetorical
    ('F8','spark','suggested',90),
    ('F8','inbound_signal','suggested',95),
    ('F8','persona','suggested',85),
    ('F8','jtbd','suggested',80),
    -- F10 KTI Candidate
    ('F10','kti','suggested',100),
    ('F10','sandbox_item','suggested',85),
    ('F10','inbound_signal','suggested',80),
    ('F10','measure','optional',60),
    -- F11 Decision Readiness
    ('F11','decision','suggested',100),
    ('F11','sandbox_item','suggested',90),
    ('F11','spark','optional',60),
    -- F12 Operational Alpha
    ('F12','workflow','suggested',95),
    ('F12','component','suggested',90),
    ('F12','task','optional',60),
    ('F12','project','optional',60)
)
INSERT INTO public.lens_object_fit (lens_id, object_kind, fit, priority)
SELECT l.id, d.object_kind, d.fit, d.priority
FROM defaults d
JOIN public.lenses l ON l.code = d.code
ON CONFLICT (lens_id, object_kind) DO NOTHING;