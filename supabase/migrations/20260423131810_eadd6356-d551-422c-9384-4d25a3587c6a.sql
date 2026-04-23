ALTER TABLE public.ingestion_files
  ADD COLUMN IF NOT EXISTS source_path text;

ALTER TABLE public.ingestion_runs
  ADD COLUMN IF NOT EXISTS analyzed_file_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analysis_total int NOT NULL DEFAULT 0;

ALTER TABLE public.ingestion_object_registry
  ADD COLUMN IF NOT EXISTS conflict_key_fields text[] NOT NULL DEFAULT ARRAY['name']::text[];

ALTER TABLE public.ingestion_schema_suggestions
  ADD COLUMN IF NOT EXISTS likely_alias_of text,
  ADD COLUMN IF NOT EXISTS low_value boolean NOT NULL DEFAULT false;

ALTER TABLE public.ingestion_object_suggestions
  ADD COLUMN IF NOT EXISTS likely_alias_of text;

CREATE TABLE IF NOT EXISTS public.ingestion_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.ingestion_files(id) ON DELETE CASCADE,
  target_table text NOT NULL,
  existing_entity_id uuid,
  existing_entity_label text,
  conflict_kind text NOT NULL DEFAULT 'exact_name',
  proposed_resolution text NOT NULL DEFAULT 'needs_review',
  status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_conflicts_run ON public.ingestion_conflicts(run_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_conflicts_file ON public.ingestion_conflicts(file_id);

ALTER TABLE public.ingestion_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view conflicts" ON public.ingestion_conflicts FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert conflicts" ON public.ingestion_conflicts FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update conflicts" ON public.ingestion_conflicts FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete conflicts" ON public.ingestion_conflicts FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE TRIGGER set_ingestion_conflicts_updated_at
  BEFORE UPDATE ON public.ingestion_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ingestion_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  signature_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  field_aliases jsonb NOT NULL DEFAULT '{}'::jsonb,
  conflict_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  hit_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_recipes_name ON public.ingestion_recipes(name);

ALTER TABLE public.ingestion_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view recipes" ON public.ingestion_recipes FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert recipes" ON public.ingestion_recipes FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update recipes" ON public.ingestion_recipes FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete recipes" ON public.ingestion_recipes FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE TRIGGER set_ingestion_recipes_updated_at
  BEFORE UPDATE ON public.ingestion_recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

UPDATE public.ingestion_object_registry SET conflict_key_fields = ARRAY['name'] WHERE object_type IN ('component','persona','document','prompt','workflow_template','session_template','playbook','journey','quest','mission');
UPDATE public.ingestion_object_registry SET conflict_key_fields = ARRAY['slug'] WHERE object_type IN ('domain','tenet');