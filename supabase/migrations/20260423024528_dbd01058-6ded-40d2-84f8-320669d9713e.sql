-- Wave 12: proposal pollination + JTBD work-instance links + new prompt rows

-- 1. Proposal columns (additive, nullable)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS matched_personas uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS matched_jtbds uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS matched_quests uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS matched_sparks uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS matched_ktis uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS suggested_kti_payload jsonb;

-- 2. JTBD link tables
CREATE TABLE IF NOT EXISTS public.task_jtbds (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  jtbd_id uuid NOT NULL REFERENCES public.jobs_to_be_done(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, jtbd_id)
);
CREATE INDEX IF NOT EXISTS idx_task_jtbds_jtbd ON public.task_jtbds(jtbd_id);
ALTER TABLE public.task_jtbds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can read task_jtbds" ON public.task_jtbds FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can write task_jtbds" ON public.task_jtbds FOR ALL TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE TABLE IF NOT EXISTS public.project_jtbds (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  jtbd_id uuid NOT NULL REFERENCES public.jobs_to_be_done(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, jtbd_id)
);
CREATE INDEX IF NOT EXISTS idx_project_jtbds_jtbd ON public.project_jtbds(jtbd_id);
ALTER TABLE public.project_jtbds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can read project_jtbds" ON public.project_jtbds FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can write project_jtbds" ON public.project_jtbds FOR ALL TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE TABLE IF NOT EXISTS public.campaign_jtbds (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  jtbd_id uuid NOT NULL REFERENCES public.jobs_to_be_done(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, jtbd_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_jtbds_jtbd ON public.campaign_jtbds(jtbd_id);
ALTER TABLE public.campaign_jtbds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can read campaign_jtbds" ON public.campaign_jtbds FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can write campaign_jtbds" ON public.campaign_jtbds FOR ALL TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

-- 3. Rollup view
CREATE OR REPLACE VIEW public.jtbd_work_pipeline AS
  SELECT
    j.id AS jtbd_id,
    j.statement,
    j.persona_id,
    (SELECT count(*) FROM public.task_jtbds tj WHERE tj.jtbd_id = j.id) AS task_count,
    (SELECT count(*) FROM public.project_jtbds pj WHERE pj.jtbd_id = j.id) AS project_count,
    (SELECT count(*) FROM public.campaign_jtbds cj WHERE cj.jtbd_id = j.id) AS campaign_count
  FROM public.jobs_to_be_done j;

-- 4. Seed new system prompts (idempotent)
INSERT INTO public.system_prompts (key, name, scope, description, system_prompt, user_prompt_template, model)
VALUES
  ('capture.intent', 'Capture — classify intent', 'capture',
   'Classifies what kind of input this is before normalization.',
   'You classify raw user captures into one canonical intent. Reply with JSON: {"intent":"observation|jtbd|task|question|trend_signal|client_update|idea","confidence":0..1,"reason":"..."}.',
   'Input:\n{{text}}\n\nReturn JSON only.',
   'google/gemini-2.5-flash-lite'),
  ('capture.match.persona', 'Capture — match personas', 'capture',
   'Picks which personas the input lights up.',
   'You match capture text against a persona library. Reply with JSON: {"matches":[{"persona_id":"uuid","why":"...","confidence":0..1}]}. Only include genuine matches (confidence >= 0.5).',
   'Input:\n{{text}}\n\nPersona library (JSON):\n{{personas_json}}\n\nReturn JSON only.',
   'google/gemini-2.5-flash'),
  ('capture.match.jtbd', 'Capture — match jobs-to-be-done', 'capture',
   'Picks which JTBDs (scoped to matched personas) this input advances or evidences.',
   'You match a capture against a JTBD library scoped to the matched personas. Reply with JSON: {"matches":[{"jtbd_id":"uuid","why":"...","confidence":0..1}]}. Only include genuine matches.',
   'Input:\n{{text}}\n\nJTBD library (JSON, already scoped to relevant personas):\n{{jtbds_json}}\n\nReturn JSON only.',
   'google/gemini-2.5-flash'),
  ('capture.match.quest_spark', 'Capture — match open quests & sparks', 'capture',
   'Picks open quests/sparks the input should attach to.',
   'You match a capture against open Quests and Sparks. Reply with JSON: {"quests":[{"id":"uuid","why":"..."}],"sparks":[{"id":"uuid","why":"..."}]}.',
   'Input:\n{{text}}\n\nOpen quests (JSON):\n{{quests_json}}\n\nOpen sparks (JSON):\n{{sparks_json}}\n\nReturn JSON only.',
   'google/gemini-2.5-flash'),
  ('capture.match.kti', 'Capture — flag matching KTIs', 'capture',
   'Flags any active KTIs whose patterns just got evidence from this input.',
   'You flag active KTIs whose watching patterns this capture provides evidence for. Reply with JSON: {"matches":[{"kti_id":"uuid","evidence":"...","fires":true|false}]}.',
   'Input:\n{{text}}\n\nActive KTIs (JSON):\n{{ktis_json}}\n\nReturn JSON only.',
   'google/gemini-2.5-flash'),
  ('capture.suggest.kti', 'Capture — suggest a new KTI to watch', 'capture',
   'When input looks like a recurring trend signal, propose a new KTI shape.',
   'When the capture looks like a recurring outside-in trend signal, propose a new KTI to add to the Watchlist. Reply with JSON: {"suggested":true|false,"name":"...","what_to_watch":"...","threshold":"...","trigger_action":"task|bot_alert|all","reason":"..."}. Set suggested=false if it is a one-off.',
   'Input:\n{{text}}\n\nIntent: {{intent}}\n\nReturn JSON only.',
   'google/gemini-2.5-flash')
ON CONFLICT (key) DO NOTHING;
