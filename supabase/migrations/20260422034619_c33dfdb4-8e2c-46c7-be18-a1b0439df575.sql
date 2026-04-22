-- =========================================================
-- Phase 2.6 — Canon reseed: 22 Domains + 22 Tenets (M:N)
-- =========================================================

-- 1. Wipe scoring + canon (safe: only seed data lived here)
delete from public.rubric_scores;
delete from public.rubric_items;
delete from public.tenets;
delete from public.domains;

-- 2. Reshape tenets: drop FK to domains, add category enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tenet_category') then
    create type public.tenet_category as enum ('Foundation', 'Specialization', 'Advanced', 'Mastery');
  end if;
end$$;

alter table public.tenets drop column if exists domain_id;
alter table public.tenets add column if not exists category public.tenet_category not null default 'Foundation';

-- 3. Optional Domain ↔ Tenet affinity
create table if not exists public.domain_tenets (
  domain_id uuid not null references public.domains(id) on delete cascade,
  tenet_id  uuid not null references public.tenets(id)  on delete cascade,
  primary key (domain_id, tenet_id)
);
alter table public.domain_tenets enable row level security;

drop policy if exists "team read domain_tenets" on public.domain_tenets;
create policy "team read domain_tenets"
  on public.domain_tenets for select to authenticated
  using (public.is_team_member(auth.uid()));

drop policy if exists "admins manage domain_tenets" on public.domain_tenets;
create policy "admins manage domain_tenets"
  on public.domain_tenets for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Seed 22 canonical Domains
insert into public.domains (slug, name, description, sort_order, enabled) values
  ('strategy-positioning',     'Strategy & Positioning',     'Defining purpose, vision, and where the practice plays.', 1, true),
  ('client-segmentation',      'Client Segmentation',        'Identifying and prioritizing the right client cohorts.',   2, true),
  ('marketing-brand',          'Marketing & Brand',          'Building presence, narrative, and demand.',                3, true),
  ('outreach-bizdev',          'Outreach & Biz Dev',         'Proactive outbound and pipeline generation.',              4, true),
  ('sales-discovery',          'Sales & Discovery',          'Converting interest into qualified engagements.',          5, true),
  ('onboarding-intake',        'Onboarding & Intake',        'Bringing new clients in cleanly and quickly.',             6, true),
  ('service-delivery',         'Service Delivery',           'Doing the work clients pay for.',                          7, true),
  ('review-value-proof',       'Review & Value Proof',       'Demonstrating outcomes and renewing trust.',               8, true),
  ('communications',           'Communications',             'Internal and external messaging cadence and clarity.',     9, true),
  ('compliance-legal',         'Compliance / Legal',         'Regulatory, contractual, and legal hygiene.',             10, true),
  ('finance-pricing',          'Finance & Pricing',          'Pricing model, margins, cash flow, and forecasting.',     11, true),
  ('funding-capital',          'Funding & Capital',          'Capital structure and funding strategy.',                 12, true),
  ('talent-vendors',           'Talent & Vendors',           'People, contractors, and vendor relationships.',          13, true),
  ('technology-tools',         'Technology & Tools',         'Stack, automation, and tooling decisions.',               14, true),
  ('security-privacy',         'Security & Privacy',         'Data protection, access control, and privacy.',           15, true),
  ('analytics-ci',             'Analytics & CI',             'Measurement, dashboards, and continuous improvement.',    16, true),
  ('education-training',       'Education & Training',       'Internal learning and client education.',                 17, true),
  ('templates-kb',             'Templates & KB',             'Reusable templates and the institutional knowledge base.', 18, true),
  ('partnerships',             'Partnerships',               'Strategic alliances, referrals, and co-delivery.',        19, true),
  ('support-success',          'Support & Success',          'Ongoing client support and adoption.',                    20, true),
  ('roadmap-innovation',       'Roadmap & Innovation',       'Product / service roadmap and experimentation.',          21, true),
  ('monetization',             'Monetization',               'Revenue streams, packaging, and expansion economics.',    22, true);

-- 5. Seed 22 canonical Tenets (independent of Domains, with Category)
insert into public.tenets (slug, name, description, category, sort_order, enabled) values
  ('strategic-vision-purpose',          'Strategic Vision & Purpose',          'Defining purpose, vision, and strategic direction for the practice', 'Foundation',     1,  true),
  ('leadership-team-development',       'Leadership & Team Development',       'Building and leading high-performing teams',                          'Foundation',     2,  true),
  ('operational-excellence',            'Operational Excellence',              'Creating efficient, scalable, and repeatable operations',             'Foundation',     3,  true),
  ('financial-mastery',                 'Financial Mastery',                   'Mastering business financial management and planning',                'Foundation',     4,  true),
  ('marketing-positioning',             'Marketing & Positioning',             'Positioning practice and building market presence',                   'Foundation',     5,  true),
  ('sales-business-development',        'Sales & Business Development',        'Developing business and converting prospects to clients',             'Foundation',     6,  true),
  ('client-experience-design',          'Client Experience Design',            'Designing exceptional client experiences',                            'Foundation',     7,  true),
  ('risk-management-compliance',        'Risk Management & Compliance',        'Managing risk and maintaining compliance',                            'Foundation',     8,  true),
  ('client-discovery-needs-analysis',   'Client Discovery & Needs Analysis',   'Deeply understanding client needs, goals, and context',               'Specialization', 9,  true),
  ('financial-planning-mastery',        'Financial Planning Mastery',          'Mastering comprehensive financial planning',                          'Specialization', 10, true),
  ('investment-philosophy-strategy',    'Investment Philosophy & Strategy',    'Developing coherent investment philosophy and strategy',              'Specialization', 11, true),
  ('estate-planning-excellence',        'Estate Planning Excellence',          'Excelling at estate planning and wealth transfer',                    'Specialization', 12, true),
  ('tax-planning-integration',          'Tax Planning Integration',            'Integrating tax planning into all advice',                            'Specialization', 13, true),
  ('insurance-strategy',                'Insurance Strategy',                  'Strategic use of insurance in planning',                              'Specialization', 14, true),
  ('business-succession-planning',      'Business Succession Planning',        'Planning for business owner transitions and succession',              'Specialization', 15, true),
  ('behavioral-finance-application',    'Behavioral Finance Application',      'Applying behavioral finance principles to client work',               'Advanced',       16, true),
  ('data-intelligence-analytics',       'Data Intelligence & Analytics',       'Leveraging data and analytics for insights',                          'Advanced',       17, true),
  ('networks-strategic-partnerships',   'Networks & Strategic Partnerships',   'Building strategic partnerships and networks',                        'Advanced',       18, true),
  ('innovation-adaptation',             'Innovation & Adaptation',             'Driving innovation and adapting to change',                           'Advanced',       19, true),
  ('communication-client-education',    'Communication & Client Education',    'Communicating complex ideas and educating clients',                   'Advanced',       20, true),
  ('crisis-leadership-mastery',         'Crisis Leadership Mastery',           'Leading during crisis and uncertainty',                               'Mastery',        21, true),
  ('legacy-industry-contribution',      'Legacy & Industry Contribution',      'Contributing to profession and leaving lasting legacy',               'Mastery',        22, true);

-- 6. One starter rubric_item per tenet so dashboards render
insert into public.rubric_items (tenet_id, prompt, excellence_definition, scale_min, scale_max, sort_order, enabled)
select t.id,
       t.name,
       coalesce(t.description, t.name),
       0, 5, t.sort_order, true
from public.tenets t;
