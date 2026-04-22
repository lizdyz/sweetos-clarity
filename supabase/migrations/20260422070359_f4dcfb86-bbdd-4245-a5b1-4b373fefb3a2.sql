ALTER TABLE public.lens_perspectives
  ADD COLUMN IF NOT EXISTS stages_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.lenses
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS user_prompt_template text,
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'google/gemini-2.5-flash';

CREATE INDEX IF NOT EXISTS idx_lens_perspectives_stages
  ON public.lens_perspectives USING gin (stages_breakdown);