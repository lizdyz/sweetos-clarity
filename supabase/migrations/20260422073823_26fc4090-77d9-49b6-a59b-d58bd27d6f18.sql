-- 1. Extend capture_attachments into a Vault
ALTER TABLE public.capture_attachments
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal','client_shared','public')),
  ADD COLUMN IF NOT EXISTS tagged_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tagged_tenets text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tagged_components uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tagged_personas uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tagged_relationships uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'capture'
    CHECK (source IN ('capture','session','document','external_ai','manual'));

CREATE INDEX IF NOT EXISTS idx_capture_attachments_visibility ON public.capture_attachments(visibility);
CREATE INDEX IF NOT EXISTS idx_capture_attachments_source ON public.capture_attachments(source);
CREATE INDEX IF NOT EXISTS idx_capture_attachments_tagged_components ON public.capture_attachments USING GIN(tagged_components);
CREATE INDEX IF NOT EXISTS idx_capture_attachments_tagged_personas ON public.capture_attachments USING GIN(tagged_personas);

-- 2. component_outputs
CREATE TABLE IF NOT EXISTS public.component_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  output_kind text NOT NULL CHECK (output_kind IN
    ('email','newsletter','prd','playbook','one_pager','spec','script',
     'template','presentation','workflow_doc','training','other')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','approved','published','retired')),
  storage_path text,
  body_md text,
  generation_prompt_key text,
  generated_by_operator_id uuid REFERENCES public.operators(id),
  generated_by_model text,
  generated_at timestamptz,
  version int NOT NULL DEFAULT 1,
  supersedes uuid REFERENCES public.component_outputs(id),
  visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal','client_shared','public')),
  for_relationship_id uuid REFERENCES public.relationships(id),
  for_persona_id uuid REFERENCES public.personas(id),
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_component_outputs_component ON public.component_outputs(component_id);
CREATE INDEX IF NOT EXISTS idx_component_outputs_status ON public.component_outputs(status);
CREATE INDEX IF NOT EXISTS idx_component_outputs_kind ON public.component_outputs(output_kind);
CREATE INDEX IF NOT EXISTS idx_component_outputs_relationship ON public.component_outputs(for_relationship_id);

ALTER TABLE public.component_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can read component_outputs"
  ON public.component_outputs FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can insert component_outputs"
  ON public.component_outputs FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team can update component_outputs"
  ON public.component_outputs FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can delete component_outputs"
  ON public.component_outputs FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_component_outputs_updated_at
  BEFORE UPDATE ON public.component_outputs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. jobs_to_be_done
CREATE TABLE IF NOT EXISTS public.jobs_to_be_done (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement text NOT NULL,
  job_type text NOT NULL DEFAULT 'functional'
    CHECK (job_type IN ('functional','emotional','social')),
  context text,
  desired_outcome text,
  current_solution text,
  pain_severity int CHECK (pain_severity BETWEEN 1 AND 5),
  persona_id uuid REFERENCES public.personas(id),
  relationship_id uuid REFERENCES public.relationships(id),
  related_domains text[] NOT NULL DEFAULT '{}',
  related_tenets text[] NOT NULL DEFAULT '{}',
  related_components uuid[] NOT NULL DEFAULT '{}',
  related_outcomes uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'discovered'
    CHECK (status IN ('discovered','validated','addressed','retired')),
  source text DEFAULT 'manual',
  source_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jtbd_persona ON public.jobs_to_be_done(persona_id);
CREATE INDEX IF NOT EXISTS idx_jtbd_relationship ON public.jobs_to_be_done(relationship_id);
CREATE INDEX IF NOT EXISTS idx_jtbd_status ON public.jobs_to_be_done(status);
CREATE INDEX IF NOT EXISTS idx_jtbd_components ON public.jobs_to_be_done USING GIN(related_components);

ALTER TABLE public.jobs_to_be_done ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can read jtbd"
  ON public.jobs_to_be_done FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can insert jtbd"
  ON public.jobs_to_be_done FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team can update jtbd"
  ON public.jobs_to_be_done FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can delete jtbd"
  ON public.jobs_to_be_done FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_jtbd_updated_at
  BEFORE UPDATE ON public.jobs_to_be_done
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Seed system_prompts for output kinds + JTBD parsing
INSERT INTO public.system_prompts (key, name, description, scope, system_prompt, user_prompt_template, model)
VALUES
  ('output.email', 'Component Output: Email',
   'Drafts a polished email from a Component context.',
   'component_output',
   'You are an expert copywriter. Given a Component (a reusable knowledge asset) and optional Persona/Relationship context, draft a clear, warm, action-oriented email. Keep it under 250 words. Return markdown with a subject line on the first line prefixed "Subject: ".',
   'Component: {{component_name}}\nDescription: {{component_description}}\nQuestions it answers: {{questions_it_answers}}\nPersona: {{persona_summary}}\nRelationship: {{relationship_summary}}\n\nDraft the email.',
   'google/gemini-2.5-flash'),
  ('output.newsletter', 'Component Output: Newsletter',
   'Drafts a newsletter section from a Component.',
   'component_output',
   'You write newsletters that feel like a smart friend wrote them. Convert the Component into a 300-500 word newsletter section with a hook, one insight, one example, one CTA.',
   'Component: {{component_name}}\nDescription: {{component_description}}\nQuestions it answers: {{questions_it_answers}}\n\nDraft the newsletter section.',
   'google/gemini-2.5-flash'),
  ('output.prd', 'Component Output: PRD',
   'Drafts a Product Requirements Document.',
   'component_output',
   'You write crisp PRDs. Sections: Problem, Users, Goals, Non-goals, Requirements, Success metrics, Open questions. Use markdown headings.',
   'Component: {{component_name}}\nDescription: {{component_description}}\nQuestions it answers: {{questions_it_answers}}\n\nDraft the PRD.',
   'google/gemini-2.5-pro'),
  ('output.one_pager', 'Component Output: One-pager',
   'Drafts a one-page summary.',
   'component_output',
   'You distill complex things into a single page. Sections: What it is, Why it matters, How it works, What you get. Maximum 400 words.',
   'Component: {{component_name}}\nDescription: {{component_description}}\n\nDraft the one-pager.',
   'google/gemini-2.5-flash'),
  ('output.playbook', 'Component Output: Playbook',
   'Drafts a step-by-step playbook.',
   'component_output',
   'You write operational playbooks. Sections: When to use, Inputs needed, Steps (numbered), Outputs, Common pitfalls.',
   'Component: {{component_name}}\nDescription: {{component_description}}\n\nDraft the playbook.',
   'google/gemini-2.5-flash'),
  ('capture.parse.jtbd', 'Capture: JTBD Detector',
   'Detects Jobs-To-Be-Done shaped statements in capture input.',
   'capture',
   'You detect Jobs-To-Be-Done. A JTBD has the shape: "When [context], I want to [motivation], so I can [outcome]." If the input contains one, extract it. Otherwise return null.',
   'Input: {{capture_text}}\n\nReturn JSON: {"is_jtbd": bool, "statement": "...", "context": "...", "desired_outcome": "...", "job_type": "functional|emotional|social"}',
   'google/gemini-2.5-flash')
ON CONFLICT (key) DO NOTHING;