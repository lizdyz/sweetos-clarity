
-- Enums
DO $$ BEGIN
  CREATE TYPE public.sparkpath_doc_status AS ENUM ('draft','published','closed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seed_template_kind AS ENUM ('mirror','map','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seed_question_badge AS ENUM ('foundational','optional','upload');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seed_question_type AS ENUM ('short_text','long_text','rich_text','number','date','single_select','multi_select','upload','checklist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- seed_templates
CREATE TABLE IF NOT EXISTS public.seed_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind public.seed_template_kind NOT NULL DEFAULT 'mirror',
  name text NOT NULL,
  description text,
  is_canonical boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.seed_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.seed_templates(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  preamble_md text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, code)
);

CREATE TABLE IF NOT EXISTS public.seed_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.seed_template_sections(id) ON DELETE CASCADE,
  code text NOT NULL,
  prompt text NOT NULL,
  hint text,
  question_type public.seed_question_type NOT NULL DEFAULT 'long_text',
  badge public.seed_question_badge NOT NULL DEFAULT 'foundational',
  options jsonb,
  watch_phrases text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, code)
);

-- client_seeds
CREATE TABLE IF NOT EXISTS public.client_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.seed_templates(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status public.sparkpath_doc_status NOT NULL DEFAULT 'draft',
  preamble_override_md text,
  access_token text NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  published_at timestamptz,
  closed_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_client_seeds_relationship ON public.client_seeds(relationship_id);
CREATE INDEX IF NOT EXISTS idx_client_seeds_status ON public.client_seeds(status);

-- seed_responses
CREATE TABLE IF NOT EXISTS public.seed_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_seed_id uuid NOT NULL REFERENCES public.client_seeds(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.seed_template_questions(id) ON DELETE CASCADE,
  response_text text,
  response_json jsonb,
  upload_storage_path text,
  word_count integer NOT NULL DEFAULT 0,
  auto_saved_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_seed_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_seed_responses_seed ON public.seed_responses(client_seed_id);

-- client_primers
CREATE TABLE IF NOT EXISTS public.client_primers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status public.sparkpath_doc_status NOT NULL DEFAULT 'draft',
  body_md text,
  hook_md text,
  ai_draft_md text,
  access_token text NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  published_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_client_primers_relationship ON public.client_primers(relationship_id);

-- client_mirror_portals
CREATE TABLE IF NOT EXISTS public.client_mirror_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  client_seed_id uuid REFERENCES public.client_seeds(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status public.sparkpath_doc_status NOT NULL DEFAULT 'draft',
  intro_md text,
  access_token text NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  published_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_mirror_portals_relationship ON public.client_mirror_portals(relationship_id);

-- client_clarity_docs
CREATE TABLE IF NOT EXISTS public.client_clarity_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  mirror_portal_id uuid REFERENCES public.client_mirror_portals(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status public.sparkpath_doc_status NOT NULL DEFAULT 'draft',
  intro_md text,
  access_token text NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  published_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_clarity_docs_relationship ON public.client_clarity_docs(relationship_id);

-- updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER trg_seed_templates_updated BEFORE UPDATE ON public.seed_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_seed_template_sections_updated BEFORE UPDATE ON public.seed_template_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_seed_template_questions_updated BEFORE UPDATE ON public.seed_template_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_client_seeds_updated BEFORE UPDATE ON public.client_seeds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_seed_responses_updated BEFORE UPDATE ON public.seed_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_client_primers_updated BEFORE UPDATE ON public.client_primers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_client_mirror_portals_updated BEFORE UPDATE ON public.client_mirror_portals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_client_clarity_docs_updated BEFORE UPDATE ON public.client_clarity_docs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable RLS
ALTER TABLE public.seed_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_primers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_mirror_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_clarity_docs ENABLE ROW LEVEL SECURITY;

-- Team-member full access policies
CREATE POLICY "team read seed_templates" ON public.seed_templates FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write seed_templates" ON public.seed_templates FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read seed_template_sections" ON public.seed_template_sections FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write seed_template_sections" ON public.seed_template_sections FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read seed_template_questions" ON public.seed_template_questions FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write seed_template_questions" ON public.seed_template_questions FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read client_seeds" ON public.client_seeds FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write client_seeds" ON public.client_seeds FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read seed_responses" ON public.seed_responses FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write seed_responses" ON public.seed_responses FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read client_primers" ON public.client_primers FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write client_primers" ON public.client_primers FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read client_mirror_portals" ON public.client_mirror_portals FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write client_mirror_portals" ON public.client_mirror_portals FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read client_clarity_docs" ON public.client_clarity_docs FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write client_clarity_docs" ON public.client_clarity_docs FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

-- Public published-read policies (anon access via slug — token enforced in app)
CREATE POLICY "public read published primers" ON public.client_primers FOR SELECT USING (status = 'published');
CREATE POLICY "public read published seeds" ON public.client_seeds FOR SELECT USING (status = 'published');
CREATE POLICY "public read published portals" ON public.client_mirror_portals FOR SELECT USING (status = 'published');
CREATE POLICY "public read published clarity" ON public.client_clarity_docs FOR SELECT USING (status = 'published');

-- Public read of template structure for published seeds (needed to render the questionnaire)
CREATE POLICY "public read templates via published seed" ON public.seed_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_seeds cs WHERE cs.template_id = seed_templates.id AND cs.status = 'published')
);
CREATE POLICY "public read sections via published seed" ON public.seed_template_sections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.client_seeds cs
    WHERE cs.template_id = seed_template_sections.template_id AND cs.status = 'published'
  )
);
CREATE POLICY "public read questions via published seed" ON public.seed_template_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.seed_template_sections s
    JOIN public.client_seeds cs ON cs.template_id = s.template_id
    WHERE s.id = seed_template_questions.section_id AND cs.status = 'published'
  )
);

-- Public response insert/update for published seeds
CREATE POLICY "public insert responses for published seeds" ON public.seed_responses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.client_seeds cs WHERE cs.id = seed_responses.client_seed_id AND cs.status = 'published')
);
CREATE POLICY "public update responses for published seeds" ON public.seed_responses FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.client_seeds cs WHERE cs.id = seed_responses.client_seed_id AND cs.status = 'published')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.client_seeds cs WHERE cs.id = seed_responses.client_seed_id AND cs.status = 'published')
);
CREATE POLICY "public read responses for published seeds" ON public.seed_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_seeds cs WHERE cs.id = seed_responses.client_seed_id AND cs.status = 'published')
);

-- Storage bucket for seed uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('seed-uploads','seed-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "team read seed-uploads" ON storage.objects FOR SELECT USING (
  bucket_id = 'seed-uploads' AND public.is_team_member(auth.uid())
);
CREATE POLICY "team write seed-uploads" ON storage.objects FOR ALL USING (
  bucket_id = 'seed-uploads' AND public.is_team_member(auth.uid())
) WITH CHECK (
  bucket_id = 'seed-uploads' AND public.is_team_member(auth.uid())
);
CREATE POLICY "public upload to seed-uploads" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'seed-uploads'
);
CREATE POLICY "public read own seed-uploads" ON storage.objects FOR SELECT USING (
  bucket_id = 'seed-uploads'
);
