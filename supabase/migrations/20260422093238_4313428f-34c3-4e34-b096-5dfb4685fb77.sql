DELETE FROM public.journeys WHERE name IN (
  'Solo → Systematized Practice',
  'Generalist → Niche Authority',
  'Founder-led → Team-led Delivery',
  'Service Business → Productized IP',
  'Practice → Sellable Asset'
);

INSERT INTO public.journeys (created_by, name, description, related_domains, status)
SELECT '65f0dbf1-d933-43cd-ae2a-50b12b7e9962'::uuid, n.name, n.description, n.domains, 'Active'
FROM (VALUES
  ('Strategic Vision & Positioning', 'Define why your business exists, who it serves, and how it stands apart in the market.', ARRAY['Purpose']),
  ('Client Acquisition', 'Build a repeatable system for finding, attracting, and converting the right clients.', ARRAY['People','Profitability']),
  ('Service Design', 'Shape what you offer, how it''s priced, and how clients experience it.', ARRAY['Product','Profitability']),
  ('Team Development', 'Hire, train, and retain the people who deliver and grow the practice.', ARRAY['People']),
  ('Technology Integration', 'Choose, connect, and automate the tools that run the business.', ARRAY['Process']),
  ('Financial Planning (Business)', 'Manage the money flowing through and out of the business.', ARRAY['Profitability']),
  ('Client Service Delivery', 'Standardize how clients are served once they''re onboard.', ARRAY['People','Process']),
  ('Operations Management', 'Run the daily and weekly mechanics that keep work moving.', ARRAY['Process']),
  ('Compliance & Risk', 'Stay safe, audit-ready, and protected from regulatory and operational risk.', ARRAY['Process']),
  ('Time Management', 'Protect attention and direct energy toward what matters most.', ARRAY['Process','Purpose']),
  ('Knowledge Management', 'Capture what your business knows so it stops living only in your head.', ARRAY['Process','Product']),
  ('Performance Tracking', 'Measure what matters so decisions are based on data, not feelings.', ARRAY['Profitability','Process'])
) AS n(name, description, domains)
WHERE NOT EXISTS (SELECT 1 FROM public.journeys j WHERE j.name = n.name);

DO $$ BEGIN
  CREATE TYPE public.component_kind AS ENUM ('user','platform','internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS component_kind public.component_kind NOT NULL DEFAULT 'user';

UPDATE public.components SET component_kind = 'platform'
WHERE name ~ '^[^[:ascii:]]'
   OR name IN ('Pre-Engagement Tools Bundle', '5-Domain Quickscan', '4-Option Machine Session Selector',
               '22-Domain Mirror Assessment', 'SparkPath Clarity Call Interview Map',
               'Pathway Decision Worksheet');

UPDATE public.components SET component_kind = 'internal'
WHERE name IN ('Recruiter Intelligence Dashboard', 'Succession Spine Map');

WITH j AS (SELECT id, name FROM public.journeys),
ins AS (
  SELECT * FROM (VALUES
    ('Strategic Vision & Positioning','Mission statement','One-sentence articulation of why the business exists.',ARRAY['Purpose']),
    ('Strategic Vision & Positioning','Niche definition','Explicit description of who the business serves and who it does not.',ARRAY['Purpose','People']),
    ('Strategic Vision & Positioning','Value proposition','Crisp statement of the unique value clients receive.',ARRAY['Purpose','Product']),
    ('Strategic Vision & Positioning','Brand identity','Visual and verbal expression of the business.',ARRAY['Purpose']),
    ('Strategic Vision & Positioning','Competitive positioning','Articulation of how the business differs from alternatives.',ARRAY['Purpose']),
    ('Strategic Vision & Positioning','Future vision','3–5 year vision of where the business is heading.',ARRAY['Purpose']),
    ('Client Acquisition','Marketing channels','Defined channels used to reach the target market.',ARRAY['People','Profitability']),
    ('Client Acquisition','Lead generation','Systematic process for generating qualified inquiries.',ARRAY['People','Profitability']),
    ('Client Acquisition','Conversion process','Repeatable steps from lead to closed client.',ARRAY['Process','Profitability']),
    ('Client Acquisition','Referral system','Structured approach to generating client referrals.',ARRAY['People']),
    ('Client Acquisition','Pipeline management','Visibility into opportunity stages and forecasted revenue.',ARRAY['Profitability','Process']),
    ('Client Acquisition','Acquisition metrics','KPIs tracking cost, time, and conversion of acquisition.',ARRAY['Profitability']),
    ('Service Design','Service catalog','Documented list of services offered with scope and inclusions.',ARRAY['Product']),
    ('Service Design','Pricing strategy','Logic and tiers used to price services.',ARRAY['Product','Profitability']),
    ('Service Design','Delivery model','How services are delivered (1:1, group, hybrid, async).',ARRAY['Product','Process']),
    ('Service Design','Client experience design','Intentional design of every touchpoint a client encounters.',ARRAY['Product','People']),
    ('Service Design','Differentiation','What makes the service offering distinct in the market.',ARRAY['Product','Purpose']),
    ('Service Design','Engagement structure','Standard engagement length, cadence, and deliverable shape.',ARRAY['Product','Process']),
    ('Team Development','Role definitions','Documented responsibilities, outcomes, and expectations per role.',ARRAY['People']),
    ('Team Development','Hiring process','Repeatable process for sourcing, evaluating, and hiring.',ARRAY['People','Process']),
    ('Team Development','Training systems','Structured onboarding and ongoing skill development.',ARRAY['People']),
    ('Team Development','Performance management','How team performance is reviewed, coached, and rewarded.',ARRAY['People']),
    ('Team Development','Culture','Defined values and behaviors that shape how the team works.',ARRAY['People','Purpose']),
    ('Team Development','Succession planning','Plan for leadership continuity and role coverage.',ARRAY['People']),
    ('Technology Integration','Core platforms','The CRM, planning, and communication systems the practice runs on.',ARRAY['Process']),
    ('Technology Integration','Integrations','Connections between systems that eliminate manual data movement.',ARRAY['Process']),
    ('Technology Integration','Automation workflows','Triggered sequences that complete work without human input.',ARRAY['Process']),
    ('Technology Integration','Data management','How client and business data is structured, stored, and maintained.',ARRAY['Process']),
    ('Technology Integration','Security','Controls protecting data, systems, and access.',ARRAY['Process']),
    ('Technology Integration','AI utilization','Where and how AI tools are applied across the business.',ARRAY['Process','Product']),
    ('Financial Planning (Business)','Revenue model','Streams and structure of how the business earns money.',ARRAY['Profitability']),
    ('Financial Planning (Business)','Expense management','Process for tracking, approving, and optimizing spend.',ARRAY['Profitability']),
    ('Financial Planning (Business)','Cash flow','Active management of money in vs money out timing.',ARRAY['Profitability']),
    ('Financial Planning (Business)','Profitability analysis','Per-service, per-client, and per-channel margin visibility.',ARRAY['Profitability']),
    ('Financial Planning (Business)','Forecasting','Forward-looking revenue and expense projections.',ARRAY['Profitability']),
    ('Financial Planning (Business)','Business valuation','Approach to measuring and growing enterprise value.',ARRAY['Profitability']),
    ('Client Service Delivery','Service standards','Defined quality bar and SLAs for client work.',ARRAY['People','Process']),
    ('Client Service Delivery','Meeting cadence','Standard rhythm of client interactions.',ARRAY['People','Process']),
    ('Client Service Delivery','Review process','Structured periodic reviews of client situation and progress.',ARRAY['People','Process']),
    ('Client Service Delivery','Communication protocols','Channels, response times, and escalation rules.',ARRAY['People','Process']),
    ('Client Service Delivery','Relationship management','How depth of relationship is built and maintained.',ARRAY['People']),
    ('Client Service Delivery','Retention systems','Proactive systems for keeping clients engaged.',ARRAY['People','Profitability']),
    ('Operations Management','Daily workflows','Routines that keep daily work moving.',ARRAY['Process']),
    ('Operations Management','Process documentation','Written SOPs for repeatable work.',ARRAY['Process']),
    ('Operations Management','Quality control','Checks that ensure deliverables meet standard.',ARRAY['Process']),
    ('Operations Management','Resource allocation','How time, people, and budget are assigned to work.',ARRAY['Process','Profitability']),
    ('Operations Management','Project management','System for planning, tracking, and shipping discrete projects.',ARRAY['Process']),
    ('Operations Management','Continuous improvement','Mechanism for surfacing and acting on improvement ideas.',ARRAY['Process','Purpose']),
    ('Compliance & Risk','Regulatory requirements','Documented obligations under applicable regulators.',ARRAY['Process']),
    ('Compliance & Risk','Documentation standards','Required record-keeping for client work and decisions.',ARRAY['Process']),
    ('Compliance & Risk','Audit preparedness','State of readiness for internal or regulatory audits.',ARRAY['Process']),
    ('Compliance & Risk','Privacy/security','Controls protecting client confidentiality and data.',ARRAY['Process']),
    ('Compliance & Risk','Error prevention','Systems that catch errors before they reach clients.',ARRAY['Process']),
    ('Compliance & Risk','Insurance coverage','E&O, cyber, and other coverage appropriate to the practice.',ARRAY['Process']),
    ('Time Management','Time tracking','How time is captured against work and clients.',ARRAY['Process']),
    ('Time Management','Prioritization system','Method for deciding what gets attention first.',ARRAY['Process','Purpose']),
    ('Time Management','Calendar management','How time blocks are protected and allocated.',ARRAY['Process']),
    ('Time Management','Delegation framework','Rules for what gets delegated and to whom.',ARRAY['People','Process']),
    ('Time Management','Energy management','Awareness of energy peaks and troughs across the week.',ARRAY['People','Purpose']),
    ('Time Management','Work-life boundaries','Explicit boundaries protecting non-work time.',ARRAY['People','Purpose']),
    ('Knowledge Management','Document organization','Structure for finding the right document fast.',ARRAY['Process']),
    ('Knowledge Management','Template library','Reusable templates for recurring deliverables.',ARRAY['Process','Product']),
    ('Knowledge Management','Knowledge base','Searchable repository of how-tos and decisions.',ARRAY['Process']),
    ('Knowledge Management','Training materials','Materials used to onboard and upskill the team.',ARRAY['People','Process']),
    ('Knowledge Management','Intellectual property','Proprietary frameworks, methods, and assets owned by the business.',ARRAY['Product']),
    ('Knowledge Management','Innovation capture','Process for capturing new ideas and turning them into IP.',ARRAY['Product','Purpose']),
    ('Performance Tracking','KPI dashboard','Top-of-house metrics reviewed on a regular cadence.',ARRAY['Profitability','Process']),
    ('Performance Tracking','Client metrics','Measures of client growth, satisfaction, and retention.',ARRAY['People']),
    ('Performance Tracking','Operational metrics','Measures of process throughput, quality, and capacity.',ARRAY['Process']),
    ('Performance Tracking','Financial metrics','Revenue, margin, cash, and growth measures.',ARRAY['Profitability']),
    ('Performance Tracking','Feedback systems','Structured collection of client and team feedback.',ARRAY['People','Process']),
    ('Performance Tracking','Review cadence','Regular rhythm for reviewing performance and acting on insight.',ARRAY['Process'])
  ) AS v(journey_name, name, description, domains)
)
INSERT INTO public.components (created_by, name, description, journey_id, current_maturity_level, quality_status, related_domains, component_kind)
SELECT '65f0dbf1-d933-43cd-ae2a-50b12b7e9962'::uuid,
       ins.name, ins.description, j.id,
       'L1 Lacking'::public.maturity_level,
       'Draft'::public.quality_status,
       ins.domains,
       'user'::public.component_kind
FROM ins JOIN j ON j.name = ins.journey_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.components c
  WHERE c.name = ins.name AND c.journey_id = j.id
);

DO $$ BEGIN
  CREATE TYPE public.outcome_source_kind AS ENUM ('quest','journey','mission','spark','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.outcomes
  ADD COLUMN IF NOT EXISTS source_kind public.outcome_source_kind NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS auto_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.trg_quest_complete_outcome()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.progression_state::text IN ('Confirmed Complete','Completed by you','Completed with Liz','Completed for you')
     AND (OLD.progression_state IS DISTINCT FROM NEW.progression_state) THEN
    UPDATE public.outcomes
       SET done_at = COALESCE(done_at, now()),
           auto_completed_at = COALESCE(auto_completed_at, now())
     WHERE source_kind = 'quest' AND source_id = NEW.id AND done_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_quest_complete_outcome ON public.quests;
CREATE TRIGGER trg_quest_complete_outcome
AFTER UPDATE ON public.quests
FOR EACH ROW EXECUTE FUNCTION public.trg_quest_complete_outcome();

CREATE OR REPLACE FUNCTION public.trg_mission_complete_outcome()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.status,'')) IN ('complete','completed','done')
     AND coalesce(OLD.status,'') IS DISTINCT FROM coalesce(NEW.status,'') THEN
    UPDATE public.outcomes
       SET done_at = COALESCE(done_at, now()),
           auto_completed_at = COALESCE(auto_completed_at, now())
     WHERE source_kind = 'mission' AND source_id = NEW.id AND done_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mission_complete_outcome ON public.missions;
CREATE TRIGGER trg_mission_complete_outcome
AFTER UPDATE ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.trg_mission_complete_outcome();

CREATE OR REPLACE FUNCTION public.trg_journey_complete_outcome()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.status,'')) IN ('complete','completed','done')
     AND coalesce(OLD.status,'') IS DISTINCT FROM coalesce(NEW.status,'') THEN
    UPDATE public.outcomes
       SET done_at = COALESCE(done_at, now()),
           auto_completed_at = COALESCE(auto_completed_at, now())
     WHERE source_kind = 'journey' AND source_id = NEW.id AND done_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_journey_complete_outcome ON public.journeys;
CREATE TRIGGER trg_journey_complete_outcome
AFTER UPDATE ON public.journeys
FOR EACH ROW EXECUTE FUNCTION public.trg_journey_complete_outcome();