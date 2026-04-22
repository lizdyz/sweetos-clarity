
-- ============ DOMAINS ============
CREATE TABLE public.domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'oklch(0.7 0.15 250)',
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read domains" ON public.domains FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
CREATE POLICY "admins manage domains" ON public.domains FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER domains_set_updated_at BEFORE UPDATE ON public.domains FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TENETS ============
CREATE TABLE public.tenets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  excellence_definition text,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  UNIQUE(domain_id, slug)
);
ALTER TABLE public.tenets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read tenets" ON public.tenets FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
CREATE POLICY "admins manage tenets" ON public.tenets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER tenets_set_updated_at BEFORE UPDATE ON public.tenets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_tenets_domain ON public.tenets(domain_id);

-- ============ RUBRIC ITEMS ============
CREATE TABLE public.rubric_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenet_id uuid NOT NULL REFERENCES public.tenets(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  excellence_definition text,
  scale_min integer NOT NULL DEFAULT 0,
  scale_max integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
ALTER TABLE public.rubric_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read rubric_items" ON public.rubric_items FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
CREATE POLICY "admins manage rubric_items" ON public.rubric_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER rubric_items_set_updated_at BEFORE UPDATE ON public.rubric_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_rubric_items_tenet ON public.rubric_items(tenet_id);

-- ============ RUBRIC SCORES ============
CREATE TABLE public.rubric_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  rubric_item_id uuid NOT NULL REFERENCES public.rubric_items(id) ON DELETE CASCADE,
  score integer,
  notes text,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  assessed_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(relationship_id, rubric_item_id)
);
ALTER TABLE public.rubric_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read rubric_scores" ON public.rubric_scores FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
CREATE POLICY "team insert rubric_scores" ON public.rubric_scores FOR INSERT TO authenticated WITH CHECK (is_team_member(auth.uid()) AND assessed_by = auth.uid());
CREATE POLICY "owner or admin update rubric_scores" ON public.rubric_scores FOR UPDATE TO authenticated USING (assessed_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner or admin delete rubric_scores" ON public.rubric_scores FOR DELETE TO authenticated USING (assessed_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER rubric_scores_set_updated_at BEFORE UPDATE ON public.rubric_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_rubric_scores_relationship ON public.rubric_scores(relationship_id);
CREATE INDEX idx_rubric_scores_item ON public.rubric_scores(rubric_item_id);

-- ============ WORKFLOW RUNS ============
CREATE TYPE public.workflow_run_status AS ENUM ('planned', 'running', 'paused', 'completed', 'cancelled');

CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  relationship_id uuid REFERENCES public.relationships(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status public.workflow_run_status NOT NULL DEFAULT 'planned',
  progress_pct integer NOT NULL DEFAULT 0,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read workflow_runs" ON public.workflow_runs FOR SELECT TO authenticated USING (is_team_member(auth.uid()));
CREATE POLICY "team insert workflow_runs" ON public.workflow_runs FOR INSERT TO authenticated WITH CHECK (is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "owner or admin update workflow_runs" ON public.workflow_runs FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner or admin delete workflow_runs" ON public.workflow_runs FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER workflow_runs_set_updated_at BEFORE UPDATE ON public.workflow_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_workflow_runs_relationship ON public.workflow_runs(relationship_id);
CREATE INDEX idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);

-- ============ SEED: DOMAINS ============
INSERT INTO public.domains (slug, name, description, color, sort_order) VALUES
  ('strategy',  'Strategy',  'Direction, positioning, and the bets you''re making.',           'oklch(0.65 0.18 265)', 1),
  ('brand',     'Brand',     'Identity, voice, and the felt sense of who you are.',            'oklch(0.72 0.16 320)', 2),
  ('offer',     'Offer',     'What you sell, how it''s shaped, and why it''s worth paying for.','oklch(0.72 0.16 30)',  3),
  ('pipeline',  'Pipeline',  'How qualified attention turns into committed clients.',          'oklch(0.70 0.16 80)',  4),
  ('delivery',  'Delivery',  'How the work actually happens and how good it is.',              'oklch(0.70 0.15 150)', 5),
  ('ops',       'Operations','Systems, tools, and the machinery that runs in the background.', 'oklch(0.68 0.12 200)', 6),
  ('people',    'People',    'Team, roles, delegation, and the humans involved.',              'oklch(0.70 0.14 230)', 7),
  ('mindset',   'Mindset',   'The owner''s clarity, capacity, and inner operating system.',    'oklch(0.70 0.16 0)',   8);

-- ============ SEED: TENETS ============
INSERT INTO public.tenets (domain_id, slug, name, description, excellence_definition, sort_order)
SELECT d.id, t.slug, t.name, t.description, t.excellence, t.sort_order FROM public.domains d
JOIN (VALUES
  ('strategy', 'clarity-of-bet',     'Clarity of Bet',          'You can name the specific bet you''re making.',         'You can state your strategic bet in one sentence and the evidence supporting it.', 1),
  ('strategy', 'positioning',        'Positioning',             'You occupy a defensible, distinct position.',           'Your positioning is sharp enough that the right buyer self-identifies on first read.', 2),
  ('strategy', 'time-horizon',       'Time Horizon',            'Decisions are made against a coherent horizon.',        'You make 12-month decisions that compound rather than 30-day decisions that churn.',   3),
  ('brand',    'voice',              'Voice',                   'A consistent, recognizable voice across surfaces.',     'A stranger could identify your writing without seeing the byline.',                    1),
  ('brand',    'visual-system',      'Visual System',           'Visual identity is coherent and intentional.',          'Every customer-facing surface uses the same system, no orphan templates.',             2),
  ('brand',    'narrative',          'Narrative',               'You tell one story, repeatedly, well.',                 'You can articulate the through-line in 30 seconds and it lands.',                       3),
  ('offer',    'shape',              'Offer Shape',             'Each offer has a clear shape and outcome.',             'Every offer has a defined start, end, deliverable, and named outcome.',                 1),
  ('offer',    'price-confidence',   'Price Confidence',        'Pricing matches value without flinching.',              'You quote price without softening or apologizing.',                                     2),
  ('offer',    'productization',     'Productization',          'The offer can be sold without bespoke negotiation.',    'A new buyer can understand and purchase without a custom proposal.',                    3),
  ('pipeline', 'lead-flow',          'Lead Flow',               'A predictable flow of qualified attention.',            'You know how many qualified leads arrive each week and where from.',                    1),
  ('pipeline', 'qualification',      'Qualification',           'Unfit leads are filtered fast.',                        'Bad-fit leads are deflected within one touch, not three meetings.',                     2),
  ('pipeline', 'close-mechanics',    'Close Mechanics',         'The path from interest to commitment is engineered.',    'Conversion has a named sequence with measurable steps, not vibes.',                    3),
  ('delivery', 'kickoff',            'Kickoff',                 'Each engagement begins from a defined starting state.', 'Day one of any engagement runs from a checklist, not improvisation.',                   1),
  ('delivery', 'cadence',            'Cadence',                 'Work moves at a known, sustainable rhythm.',            'You and the client both know what happens this week and next.',                         2),
  ('delivery', 'quality-bar',        'Quality Bar',             'There is a written standard for what good looks like.', 'You can show the rubric you''re evaluating the work against.',                          3),
  ('ops',      'systems-of-record',  'Systems of Record',       'One place for each kind of truth.',                     'Every entity (client, project, doc) lives in exactly one canonical place.',             1),
  ('ops',      'automation',         'Automation',              'Repetitive work is mechanized.',                        'No human re-types data that already exists in another system.',                         2),
  ('ops',      'observability',      'Observability',           'You can see what''s happening without asking.',         'A 30-second glance tells you the state of the business.',                               3),
  ('people',   'roles',              'Roles',                   'Each role is named, scoped, and accountable.',          'Every responsibility has a named owner; no orphaned work.',                             1),
  ('people',   'delegation',         'Delegation',              'Work moves to the right level reliably.',               'You delegate by outcome, not by task, and outcomes land.',                              2),
  ('people',   'feedback',           'Feedback',                'Performance conversations happen on cadence.',          '1:1s and reviews happen on a calendar, not on a crisis.',                               3),
  ('mindset',  'clarity',            'Clarity',                 'You know what you want and why.',                       'You can articulate the next 90 days without spiraling.',                                1),
  ('mindset',  'capacity',           'Capacity',                'You operate from rest, not depletion.',                  'You end most weeks with margin, not at zero.',                                          2),
  ('mindset',  'identity',           'Identity',                'You operate from your highest version, not survival.',  'Decisions are made from the owner you''re becoming, not the one putting out fires.',    3)
) AS t(domain_slug, slug, name, description, excellence, sort_order) ON t.domain_slug = d.slug;

-- ============ SEED: RUBRIC ITEMS ============
INSERT INTO public.rubric_items (tenet_id, prompt, excellence_definition, sort_order)
SELECT t.id, r.prompt, r.excellence, r.sort_order FROM public.tenets t
JOIN (VALUES
  ('clarity-of-bet',    'Can you state the strategic bet in one sentence?',                             'Stated cleanly, no hedging, with the evidence.',                          1),
  ('clarity-of-bet',    'Is everyone on the team able to repeat the bet?',                              'Anyone in the org can articulate it the same way.',                       2),
  ('positioning',       'Does your positioning name a specific buyer and a specific shift?',            'Buyer + before-state + after-state are explicit.',                        1),
  ('positioning',       'Would a competitor''s positioning fit you if you swapped logos?',              'No — your positioning is non-substitutable.',                             2),
  ('voice',             'Is there a written voice guide or set of voice rules?',                        'Yes, with do/don''t examples and a tone scale.',                          1),
  ('voice',             'Are external touchpoints reviewed against the voice?',                         'Yes — copy passes a voice check before going out.',                       2),
  ('shape',             'Does each offer have a one-page outline (outcome, scope, price, timeline)?',   'Yes, current, and shared with the team.',                                  1),
  ('shape',             'Is the named outcome measurable?',                                              'Yes — you can tell whether it was delivered.',                            2),
  ('lead-flow',         'Do you know your qualified-lead count this week?',                              'Yes, to within 10%, without asking anyone.',                              1),
  ('lead-flow',         'Do you know which channel is producing them?',                                  'Yes, channel attribution is tracked.',                                    2),
  ('kickoff',           'Do new engagements begin from a written kickoff checklist?',                    'Yes — same checklist runs every time.',                                   1),
  ('kickoff',           'Is the client''s starting state captured before work begins?',                  'Yes, captured in the system of record.',                                  2),
  ('systems-of-record', 'For each entity (client, project, doc), is there one canonical home?',          'Yes — no parallel sources of truth.',                                     1),
  ('systems-of-record', 'When data conflicts between tools, do you know which one wins?',                'Yes — the canon is named and enforced.',                                  2),
  ('roles',             'Does every active responsibility have a named owner?',                          'Yes — no orphaned work.',                                                  1),
  ('roles',             'Are role boundaries written down?',                                             'Yes — there''s a doc people can reference.',                              2),
  ('clarity',           'Can you describe the next 90 days without spiraling?',                          'Yes — calmly and concretely.',                                            1),
  ('clarity',           'Are your top 3 priorities the same this week as last week?',                    'Yes — priorities are stable, not reactive.',                              2)
) AS r(tenet_slug, prompt, excellence, sort_order) ON r.tenet_slug = t.slug;
