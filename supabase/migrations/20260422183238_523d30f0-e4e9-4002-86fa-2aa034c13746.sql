-- Enums
DO $$ BEGIN
  CREATE TYPE public.spark_template_status AS ENUM ('draft','active','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.spark_template_source AS ENUM ('curated','promoted_from_ai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.spark_generation_tier AS ENUM ('template','adapted','generated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- spark_templates
CREATE TABLE IF NOT EXISTS public.spark_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  body_template text NOT NULL,
  intent text,
  probes text[] NOT NULL DEFAULT '{}',
  applicable_journeys uuid[] NOT NULL DEFAULT '{}',
  applicable_components uuid[] NOT NULL DEFAULT '{}',
  applicable_maturity_levels text[] NOT NULL DEFAULT '{}',
  reuse_count integer NOT NULL DEFAULT 0,
  avg_rating numeric(3,2),
  status public.spark_template_status NOT NULL DEFAULT 'active',
  source_kind public.spark_template_source NOT NULL DEFAULT 'curated',
  origin_spark_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spark_templates_status ON public.spark_templates(status);
CREATE INDEX IF NOT EXISTS idx_spark_templates_journeys ON public.spark_templates USING GIN(applicable_journeys);
CREATE INDEX IF NOT EXISTS idx_spark_templates_components ON public.spark_templates USING GIN(applicable_components);
CREATE INDEX IF NOT EXISTS idx_spark_templates_maturity ON public.spark_templates USING GIN(applicable_maturity_levels);

ALTER TABLE public.spark_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members view spark_templates"
  ON public.spark_templates FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members insert spark_templates"
  ON public.spark_templates FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members update spark_templates"
  ON public.spark_templates FOR UPDATE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Admins delete spark_templates"
  ON public.spark_templates FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_spark_templates_updated
  BEFORE UPDATE ON public.spark_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- spark_template_usages
CREATE TABLE IF NOT EXISTS public.spark_template_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.spark_templates(id) ON DELETE CASCADE,
  spark_id uuid,
  component_id uuid,
  used_at timestamptz NOT NULL DEFAULT now(),
  kept boolean,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_spark_template_usages_template ON public.spark_template_usages(template_id);
CREATE INDEX IF NOT EXISTS idx_spark_template_usages_component ON public.spark_template_usages(component_id);

ALTER TABLE public.spark_template_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members view spark_template_usages"
  ON public.spark_template_usages FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members insert spark_template_usages"
  ON public.spark_template_usages FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members update spark_template_usages"
  ON public.spark_template_usages FOR UPDATE
  USING (public.is_team_member(auth.uid()));

-- sparks: add template_id + generation_tier
ALTER TABLE public.sparks
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.spark_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generation_tier public.spark_generation_tier;

CREATE INDEX IF NOT EXISTS idx_sparks_template ON public.sparks(template_id);

-- Rollup trigger: update reuse_count + avg_rating on the template
CREATE OR REPLACE FUNCTION public.trg_spark_template_usage_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid;
BEGIN
  _tid := COALESCE(NEW.template_id, OLD.template_id);
  UPDATE public.spark_templates t
  SET reuse_count = (
        SELECT count(*) FROM public.spark_template_usages u WHERE u.template_id = _tid
      ),
      avg_rating = (
        SELECT round(avg(rating)::numeric, 2)
        FROM public.spark_template_usages u
        WHERE u.template_id = _tid AND u.rating IS NOT NULL
      ),
      updated_at = now()
  WHERE t.id = _tid;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_usage_rollup_ins ON public.spark_template_usages;
CREATE TRIGGER trg_usage_rollup_ins
  AFTER INSERT OR UPDATE OR DELETE ON public.spark_template_usages
  FOR EACH ROW EXECUTE FUNCTION public.trg_spark_template_usage_rollup();