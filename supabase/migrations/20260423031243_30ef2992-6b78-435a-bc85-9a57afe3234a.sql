-- 1. entity_canon: capture_prompts + coverage_rules
alter table public.entity_canon
  add column if not exists capture_prompts text[] not null default '{}',
  add column if not exists coverage_rules jsonb not null default '{
    "stale_capture_days": 21,
    "require_jtbd_link": false,
    "require_active_kti": false,
    "min_sparks_per_quarter": 1
  }'::jsonb;

-- 2. org_settings
create table if not exists public.org_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.org_settings enable row level security;
drop policy if exists "team can read org settings" on public.org_settings;
create policy "team can read org settings" on public.org_settings for select
  using (public.is_team_member(auth.uid()));
drop policy if exists "team can write org settings" on public.org_settings;
create policy "team can write org settings" on public.org_settings for all
  using (public.is_team_member(auth.uid()))
  with check (public.is_team_member(auth.uid()));
insert into public.org_settings (key, value)
values ('gap_closer', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;

-- 3. gap_scan_runs
create table if not exists public.gap_scan_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  entities_scanned int not null default 0,
  gaps_found int not null default 0,
  sparks_created int not null default 0,
  error text,
  notes jsonb
);
alter table public.gap_scan_runs enable row level security;
drop policy if exists "team can read gap_scan_runs" on public.gap_scan_runs;
create policy "team can read gap_scan_runs" on public.gap_scan_runs for select
  using (public.is_team_member(auth.uid()));

-- 4. proposals: subject context
alter table public.proposals
  add column if not exists subject_kind text,
  add column if not exists subject_id uuid,
  add column if not exists source_page text;
create index if not exists idx_proposals_subject
  on public.proposals (subject_kind, subject_id)
  where subject_kind is not null;

-- 5. Seed capture_prompts + coverage_rules per entity_kind
update public.entity_canon set
  capture_prompts = case entity_kind
    when 'relationship' then array['Current pain or wedge moment','Decision they''re stuck on','Who else is in the room','What "good" looks like in 90 days','Any KTI evidence you''ve seen','Latest revenue / engagement signal']
    when 'persona' then array['Fresh quote from them this week','Changed circumstance or new role','New objection you heard','JTBD that suddenly matters more','A trigger event worth watching']
    when 'project' then array['What''s blocking','What shipped since last update','Who''s seen the artifact','Is the JTBD still right','What would unstick it today']
    when 'task' then array['What''s the next concrete move','Who''s waiting on what','Why is this still open']
    when 'campaign' then array['Reaction so far','What surprised you','Who responded / who didn''t','Next nudge or follow-up']
    when 'quest' then array['Where are we in the arc','What changed for the protagonist','Evidence the quest is working','What would close it out']
    when 'spark' then array['Why this still matters (or doesn''t)','What evidence backs it up','Who should see it']
    when 'component' then array['Latest version / output produced','Who used it and how','What''s missing for next maturity level','Reusability beyond current client']
    when 'mission' then array['Status of the transformation','Capability gaps still open','Next milestone']
    when 'outcome' then array['How is this trending','What''s the next reading','Who owns the next move']
    when 'workflow' then array['What ran well','Where humans had to step in','Where it broke or stalled']
    when 'session' then array['Most surprising moment','Decision made or deferred','Follow-up commitments','Energy / engagement read']
    when 'operator' then array['What they''re working on right now','Capacity / load read','Likes / dislikes update']
    when 'domain' then array['Maturity shift in this domain','Tenet currently being tested','Recent evidence for or against']
    when 'tenet' then array['Where this tenet was upheld','Where it was violated','Refinement worth proposing']
    when 'jtbd' then array['Fresh evidence the job is real','Who else has this job','Hire / fire signal you saw']
    when 'kti' then array['Reading observed today','Did it fire / nearly fire','Trend across last 4 readings']
    else capture_prompts
  end,
  coverage_rules = case entity_kind
    when 'relationship' then '{"stale_capture_days": 14, "require_jtbd_link": true, "require_active_kti": false, "min_sparks_per_quarter": 2}'::jsonb
    when 'persona' then '{"stale_capture_days": 60, "require_jtbd_link": true, "require_active_kti": false, "min_sparks_per_quarter": 1}'::jsonb
    when 'project' then '{"stale_capture_days": 14, "require_jtbd_link": true, "require_active_kti": false, "min_sparks_per_quarter": 1}'::jsonb
    when 'campaign' then '{"stale_capture_days": 21, "require_jtbd_link": true, "require_active_kti": false, "min_sparks_per_quarter": 1}'::jsonb
    when 'quest' then '{"stale_capture_days": 21, "require_jtbd_link": false, "require_active_kti": false, "min_sparks_per_quarter": 2}'::jsonb
    when 'kti' then '{"stale_capture_days": 7, "require_jtbd_link": false, "require_active_kti": true, "min_sparks_per_quarter": 1}'::jsonb
    when 'component' then '{"stale_capture_days": 45, "require_jtbd_link": false, "require_active_kti": false, "min_sparks_per_quarter": 1}'::jsonb
    else coverage_rules
  end;

-- 6. Seed gap.scanner.propose
insert into public.system_prompts (key, name, description, scope, system_prompt, user_prompt_template, model)
values (
  'gap.scanner.propose',
  'Gap scanner — propose Spark',
  'Used by the Auto-spark Gaps cron to draft a focused Spark question for an entity that has a coverage gap.',
  'sparks',
  'You are a curator helping an operator close knowledge gaps. Given an entity (its kind, name, and the specific gap detected), write ONE focused Spark — a short question (max 18 words) that, if answered, would close the gap. Be specific. Reference the entity by name. Do not editorialize. Output JSON: {"title": "...", "body": "..."}.',
  'Entity kind: {{entity_kind}}\nEntity name: {{entity_name}}\nGap: {{gap_description}}\nLast capture: {{last_capture}}\nCoverage rule violated: {{rule}}\n\nDraft the Spark.',
  'google/gemini-2.5-flash'
)
on conflict (key) do nothing;