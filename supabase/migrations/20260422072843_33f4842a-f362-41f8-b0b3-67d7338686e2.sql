
-- 1. system_prompts (master prompt registry)
CREATE TABLE IF NOT EXISTS public.system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  scope text,
  system_prompt text,
  user_prompt_template text,
  model text DEFAULT 'google/gemini-2.5-flash',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can read system_prompts"
ON public.system_prompts FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team can insert system_prompts"
ON public.system_prompts FOR INSERT TO authenticated
WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team can update system_prompts"
ON public.system_prompts FOR UPDATE TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team can delete system_prompts"
ON public.system_prompts FOR DELETE TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_system_prompts_updated_at
BEFORE UPDATE ON public.system_prompts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. excellence_checklist_proposals
CREATE TABLE IF NOT EXISTS public.excellence_checklist_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES public.domains(id) ON DELETE CASCADE,
  tenet_id uuid REFERENCES public.tenets(id) ON DELETE CASCADE,
  rubric_id uuid REFERENCES public.excellence_rubric(id) ON DELETE SET NULL,
  proposed_text text NOT NULL,
  rationale text,
  source_url text,
  source_snippet text,
  confidence numeric DEFAULT 0.5,
  status text NOT NULL DEFAULT 'pending',
  scanner_run_id uuid REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text
);

ALTER TABLE public.excellence_checklist_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team reads checklist proposals"
ON public.excellence_checklist_proposals FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team inserts checklist proposals"
ON public.excellence_checklist_proposals FOR INSERT TO authenticated
WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team updates checklist proposals"
ON public.excellence_checklist_proposals FOR UPDATE TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team deletes checklist proposals"
ON public.excellence_checklist_proposals FOR DELETE TO authenticated
USING (public.is_team_member(auth.uid()));

-- 3. ocda_stage on actionable records
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ocda_stage text
  CHECK (ocda_stage IS NULL OR ocda_stage IN ('observe','choose','decide','act'));

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS ocda_stage text
  CHECK (ocda_stage IS NULL OR ocda_stage IN ('observe','choose','decide','act'));

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS ocda_stage text DEFAULT 'decide'
  CHECK (ocda_stage IS NULL OR ocda_stage IN ('observe','choose','decide','act'));

-- 4. agent_role on operators (for signal_scanner / curator subtypes)
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS agent_role text;

-- 5. Seed 9th BizzyBot (F9 — placeholder)
INSERT INTO public.lenses (code, name, tagline, accent_color, model, sort_order, stages, what_it_asks, best_use, bizzybot_emoji)
VALUES (
  'F9',
  'F9 — TBD',
  'Placeholder for the ninth BizzyBot. Edit this from the Prompt Console.',
  '#a78bfa',
  'google/gemini-2.5-flash',
  90,
  ARRAY['Stage 1','Stage 2','Stage 3'],
  'Define what this BizzyBot asks of any subject.',
  'Define when to use this BizzyBot.',
  '🔮'
)
ON CONFLICT (code) DO NOTHING;

-- 6. Seed default system prompts
INSERT INTO public.system_prompts (key, name, description, scope, system_prompt, user_prompt_template, model) VALUES
('capture.parse', 'Capture Parser', 'Parses raw capture input (text/voice) into a structured proposal.', 'capture',
 'You parse free-form captures into structured proposals: intent, entity_kind, candidate fields, tags. Be conservative; mark low confidence rather than inventing.',
 'Capture: {{capture_text}}\nReturn JSON proposal with: entity_kind, fields, tagged_domains, tagged_tenets, tagged_components, confidence.',
 'google/gemini-2.5-flash'),
('queue.tag', 'Proposal Tagger', 'Suggests domains/tenets/components for an unstructured proposal.', 'queue',
 'You tag proposals against the canonical SweetBOS taxonomies. Suggest 1–3 of each. Never invent new taxonomy values.',
 'Proposal payload: {{payload_json}}\nReturn JSON: { tagged_domains, tagged_tenets, tagged_components, rationale }.',
 'google/gemini-2.5-flash'),
('ocda.suggest', 'OCDA — Suggest Next Move', 'Given OCDA column state, suggest the next observation/choice/decision/action.', 'ocda',
 'You are the OCDA copilot. Given the user''s current stack (observations, choices, decisions, actions), name the single most useful next move and why. One sentence per move.',
 'Stage: {{stage}}\nCurrent items: {{items_json}}\nReturn: { next_move, rationale }.',
 'google/gemini-2.5-flash'),
('signal.scan', 'Signal Scanner', 'Reads external signals against a Domain''s excellence rubric and proposes new checklist items.', 'scanner',
 'You synthesize external best-practice signals into concrete checklist items for a Domain''s Excellence Rubric. Each proposal must include: text, rationale, source_url, confidence (0–1). Never duplicate existing items.',
 'Domain: {{domain_name}}\nExisting checklist: {{existing_checklist}}\nFetched signals: {{signals_json}}\nReturn JSON: { proposals: [{ proposed_text, rationale, source_url, source_snippet, confidence }] }.',
 'google/gemini-2.5-flash')
ON CONFLICT (key) DO NOTHING;
