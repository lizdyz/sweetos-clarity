
-- =========================================================================
-- ENUMS
-- =========================================================================
create type public.app_role as enum ('admin', 'member');

create type public.progression_state as enum (
  'Not Started','Open','Pre-filled','Provisionally Satisfied',
  'Completed by you','Completed with Liz','Completed for you',
  'Confirmed Complete','Skipped','Reopened','Superseded'
);

create type public.source_of_advancement as enum (
  'Seed','Mirror','Map Session','Machine Build','SweetSync Spark','SweetSync Quest',
  'Uploaded Material','Session Judgment','Observation','System Extract','Client Self-Report'
);

create type public.intelligence_confidence as enum (
  'Not Yet Verified','Inferred','Observed','Verified','Confirmed'
);

create type public.state_of_the_thing as enum (
  'Identified','Defined','Designed','Built','Delivered','Adopted','Sustained'
);

create type public.sweetcycle_phase as enum ('Seed','Synthesize','Session','Sync','Ship');

create type public.quality_status as enum ('Draft','Tested','Proven','Canonical');
create type public.spec_status as enum ('Emerging','Draft','Proven','Refined');
create type public.maturity_level as enum ('L1 Lacking','L2 Learning','L3 Launching','L4 Leveraging','L5 Leading');
create type public.spark_type as enum ('Question','Creation','Definition','Decision','Reflection','Action');

-- =========================================================================
-- HELPERS
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =========================================================================
-- PROFILES + ROLES
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_team_member(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

-- Auto-create profile + default 'member' role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));

  select not exists (select 1 from public.user_roles) into is_first;
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'admin'::app_role else 'member'::app_role end);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles RLS
create policy "team can view profiles" on public.profiles
  for select to authenticated using (public.is_team_member(auth.uid()));
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "admins update any profile" on public.profiles
  for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- user_roles RLS
create policy "team can view roles" on public.user_roles
  for select to authenticated using (public.is_team_member(auth.uid()));
create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- GENERIC RLS HELPER (applied per table below)
-- Standard pattern: team can read; team can insert (created_by = self);
--                   owner or admin can update/delete.
-- =========================================================================

-- Macro-style: we just inline the policies for each table.

-- =========================================================================
-- RELATIONSHIPS
-- =========================================================================
create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  company text,
  role text,
  email text,
  type text,
  status text,
  pipeline_stage text,
  mirror_status text,
  active_services text[] default '{}',
  geography text,
  ai_sophistication text,
  last_contact date,
  last_touchpoint_type text,
  ideal_next_touchpoint text,
  brief_for_next_touchpoint text,
  next_action text,
  next_action_due date,
  portal_delivered boolean default false,
  portal_link text,
  sessions_purchased int default 0,
  sessions_used int default 0,
  sessions_remaining int generated always as (coalesce(sessions_purchased,0) - coalesce(sessions_used,0)) stored,
  sweetconnect_credits int default 0,
  sweetconnect_credits_used int default 0,
  revenue_potential_usd numeric(12,2),
  referred_by uuid references public.relationships(id) on delete set null,
  intelligence_summary text,
  intelligence_confidence public.intelligence_confidence default 'Not Yet Verified',
  execution_prompt text,
  prompt_status text,
  persona_id uuid,
  narrative_persona text,
  notes text
);
alter table public.relationships enable row level security;
create trigger trg_rel_updated before update on public.relationships for each row execute function public.set_updated_at();
create index idx_rel_status on public.relationships(status);
create index idx_rel_pipeline on public.relationships(pipeline_stage);

-- =========================================================================
-- WORKFLOWS
-- =========================================================================
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  description text,
  theme text,
  map_available boolean default false,
  machine_available boolean default false,
  sweetsync_decomposed boolean default false,
  quality_status public.quality_status default 'Draft',
  reuse_count int default 0,
  related_tenets text[] default '{}',
  required_inputs text[] default '{}',
  origin_client uuid references public.relationships(id) on delete set null,
  notes text
);
alter table public.workflows enable row level security;
create trigger trg_wf_updated before update on public.workflows for each row execute function public.set_updated_at();

-- per-client workflow state
create table public.workflow_states (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  workflow_id uuid not null references public.workflows(id) on delete cascade,
  client_id uuid not null references public.relationships(id) on delete cascade,
  state_of_the_thing public.state_of_the_thing default 'Identified',
  source_of_advancement public.source_of_advancement,
  notes text,
  unique (workflow_id, client_id)
);
alter table public.workflow_states enable row level security;
create trigger trg_wfs_updated before update on public.workflow_states for each row execute function public.set_updated_at();

-- =========================================================================
-- PROJECTS
-- =========================================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  status text,
  owner text,
  priority text,
  sprint text,
  type text,
  deadline date,
  next_action text,
  next_action_due date,
  next_deliverable_specific text,
  current_blocker_specific text,
  dependencies text,
  project_brief text,
  last_updated timestamptz default now(),
  revenue_potential_usd numeric(12,2),
  execution_prompt text,
  prompt_status text,
  client_id uuid references public.relationships(id) on delete set null
);
alter table public.projects enable row level security;
create trigger trg_proj_updated before update on public.projects for each row execute function public.set_updated_at();
create index idx_proj_sprint on public.projects(sprint);
create index idx_proj_client on public.projects(client_id);

-- =========================================================================
-- TASKS
-- =========================================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  status text,
  owner text,
  priority text,
  due_date date,
  effort text,
  recurring boolean default false,
  recurring_cadence text,
  for_whom text,
  success_criteria text,
  dependencies text,
  waiting_on text,
  context_to_load text,
  execution_prompt text,
  prompt_status text,
  output_format text,
  output_link text,
  deliverable_specific text,
  frameworks_lenses text[] default '{}',
  notes text,
  relationship_id uuid references public.relationships(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null
);
alter table public.tasks enable row level security;
create trigger trg_task_updated before update on public.tasks for each row execute function public.set_updated_at();
create index idx_task_status on public.tasks(status);
create index idx_task_due on public.tasks(due_date);
create index idx_task_project on public.tasks(project_id);
create index idx_task_relationship on public.tasks(relationship_id);

-- =========================================================================
-- PERSONAS / PLAYBOOKS / MISSIONS / JOURNEYS / COMPONENTS / OUTCOMES / QUESTS / SPARKS
-- (created before sessions to satisfy FK references)
-- =========================================================================
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  sector text,
  practice_structure text,
  regulatory_registration text[] default '{}',
  autonomy_level text,
  seed_adaptation_notes text,
  contract_considerations text,
  real_examples text,
  spec_status public.spec_status default 'Emerging',
  notes text
);
alter table public.personas enable row level security;
create trigger trg_per_updated before update on public.personas for each row execute function public.set_updated_at();

create table public.playbooks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  service text,
  persona_id uuid references public.personas(id) on delete set null,
  cadence text,
  spec_status public.spec_status default 'Emerging',
  best_practice_path text,
  named_alternates text,
  seed_intelligence_layer text,
  minimum_viable_seed text,
  contract_rules_surfaced text,
  bizzybot_signals text[] default '{}',
  client_journey_note text,
  what_we_have_learned text,
  required_inputs text[] default '{}'
);
alter table public.playbooks enable row level security;
create trigger trg_pb_updated before update on public.playbooks for each row execute function public.set_updated_at();

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  client_id uuid references public.relationships(id) on delete set null,
  status text,
  activated_journeys uuid[] default '{}',
  target_timeframe text
);
alter table public.missions enable row level security;
create trigger trg_mis_updated before update on public.missions for each row execute function public.set_updated_at();

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  status text,
  related_domains text[] default '{}',
  related_tenets text[] default '{}'
);
alter table public.journeys enable row level security;
create trigger trg_jrn_updated before update on public.journeys for each row execute function public.set_updated_at();

create table public.components (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  journey_id uuid references public.journeys(id) on delete set null,
  current_maturity_level public.maturity_level default 'L1 Lacking',
  maturity_threshold_definition text,
  quality_status public.quality_status default 'Draft',
  reuse_count int default 0,
  related_domains text[] default '{}',
  related_tenets text[] default '{}',
  related_workflows uuid[] default '{}',
  created_from_session_id uuid,
  last_reviewed date
);
alter table public.components enable row level security;
create trigger trg_cmp_updated before update on public.components for each row execute function public.set_updated_at();

create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  outcome_type text not null,
  description text,
  measured_value text,
  measured_date date,
  component_id uuid references public.components(id) on delete set null,
  client_id uuid references public.relationships(id) on delete set null
);
alter table public.outcomes enable row level security;
create trigger trg_out_updated before update on public.outcomes for each row execute function public.set_updated_at();

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  journey_id uuid references public.journeys(id) on delete set null,
  components_advanced jsonb default '[]'::jsonb,
  deliverable_produced_id uuid,
  framework_lens text,
  bizzybot_perspective text,
  progression_state public.progression_state default 'Not Started',
  source_of_advancement public.source_of_advancement
);
alter table public.quests enable row level security;
create trigger trg_qst_updated before update on public.quests for each row execute function public.set_updated_at();

create table public.sparks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  spark_type public.spark_type,
  quest_id uuid references public.quests(id) on delete set null,
  content text,
  sequence_order int default 0,
  progression_state public.progression_state default 'Not Started',
  source_of_advancement public.source_of_advancement,
  captured_answer text,
  confidence public.intelligence_confidence,
  affected_domains text[] default '{}',
  affected_tenets text[] default '{}',
  affected_components uuid[] default '{}'
);
alter table public.sparks enable row level security;
create trigger trg_spk_updated before update on public.sparks for each row execute function public.set_updated_at();

-- now add persona_id FK on relationships
alter table public.relationships
  add constraint relationships_persona_fk foreign key (persona_id) references public.personas(id) on delete set null;

-- =========================================================================
-- DOCUMENTS / DELIVERABLES
-- =========================================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  type text,
  status text,
  owner text,
  tone_voice text,
  version text,
  last_reviewed date,
  full_brief text,
  audience_primary_concern text,
  length_format text,
  drive_chat_link text,
  execution_prompt text,
  prompt_status text,
  for_client_id uuid references public.relationships(id) on delete set null,
  used_in_workflows uuid[] default '{}',
  notes text
);
alter table public.documents enable row level security;
create trigger trg_doc_updated before update on public.documents for each row execute function public.set_updated_at();

-- =========================================================================
-- SESSIONS
-- =========================================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  service text,
  delivery_variation text,
  status text,
  sweetcycle_phase public.sweetcycle_phase default 'Seed',
  session_date date,
  session_number int,
  seed_submitted boolean default false,
  seed_status text,
  sync_status text,
  ship_status text,
  key_findings text,
  client_perception_summary text,
  reality_assessment_summary text,
  biggest_gap text,
  next_recommended_service text,
  what_i_learned text,
  progression_state public.progression_state default 'Not Started',
  source_of_advancement public.source_of_advancement,
  confidence public.intelligence_confidence default 'Not Yet Verified',
  relationship_id uuid references public.relationships(id) on delete set null,
  workflow_id uuid references public.workflows(id) on delete set null,
  linked_project_id uuid references public.projects(id) on delete set null,
  persona_id uuid references public.personas(id) on delete set null,
  playbook_id uuid references public.playbooks(id) on delete set null
);
alter table public.sessions enable row level security;
create trigger trg_ses_updated before update on public.sessions for each row execute function public.set_updated_at();
create index idx_ses_relationship on public.sessions(relationship_id);
create index idx_ses_workflow on public.sessions(workflow_id);
create index idx_ses_phase on public.sessions(sweetcycle_phase);

-- backfill components.created_from_session_id FK now that sessions exists
alter table public.components
  add constraint components_session_fk foreign key (created_from_session_id) references public.sessions(id) on delete set null;

-- =========================================================================
-- DELEGATION
-- =========================================================================
create table public.delegation (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  task_or_responsibility text not null,
  currently_done_by text,
  can_be_delegated_to text,
  category text,
  delegation_type text,
  effort_to_hand_off text,
  only_liz_can_do_this_because text,
  what_would_make_it_delegatable text,
  status text,
  notes text,
  linked_project_id uuid references public.projects(id) on delete set null
);
alter table public.delegation enable row level security;
create trigger trg_del_updated before update on public.delegation for each row execute function public.set_updated_at();

-- =========================================================================
-- DECISIONS
-- =========================================================================
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  decision text not null,
  status text,
  domain text,
  date_made date,
  made_by text,
  context text,
  implications text,
  supersedes uuid references public.decisions(id) on delete set null,
  related_project_id uuid references public.projects(id) on delete set null
);
alter table public.decisions enable row level security;
create trigger trg_dec_updated before update on public.decisions for each row execute function public.set_updated_at();

-- =========================================================================
-- CAMPAIGNS
-- =========================================================================
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  campaign_name text not null,
  status text,
  type text,
  owner text,
  goal text,
  revenue_target_usd numeric(12,2),
  deadline date,
  key_deliverables text,
  next_executable_action text,
  next_milestone text,
  brief_for_next_action text,
  blocked_by text,
  campaign_brief text,
  target_persona text[] default '{}',
  execution_prompt text,
  prompt_status text,
  notes text
);
alter table public.campaigns enable row level security;
create trigger trg_cam_updated before update on public.campaigns for each row execute function public.set_updated_at();

-- =========================================================================
-- DOMAIN ASSESSMENTS
-- =========================================================================
create table public.domain_assessments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text,
  client_id uuid references public.relationships(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  domain text not null,
  client_score int,
  liz_score int,
  gap int,
  gap_direction text,
  confidence public.intelligence_confidence default 'Not Yet Verified',
  priority text,
  spark_type_affinity text[] default '{}',
  assessment_date date default now(),
  progression_note text,
  notes text
);
alter table public.domain_assessments enable row level security;
create trigger trg_da_updated before update on public.domain_assessments for each row execute function public.set_updated_at();
create index idx_da_client on public.domain_assessments(client_id);

-- =========================================================================
-- LINKAGE TABLES
-- =========================================================================
create table public.session_deliverables (
  session_id uuid references public.sessions(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  primary key (session_id, document_id)
);
alter table public.session_deliverables enable row level security;

create table public.session_components (
  session_id uuid references public.sessions(id) on delete cascade,
  component_id uuid references public.components(id) on delete cascade,
  advancement_type text,
  primary key (session_id, component_id)
);
alter table public.session_components enable row level security;

create table public.workflow_components (
  workflow_id uuid references public.workflows(id) on delete cascade,
  component_id uuid references public.components(id) on delete cascade,
  primary key (workflow_id, component_id)
);
alter table public.workflow_components enable row level security;

create table public.workflow_domains (
  workflow_id uuid references public.workflows(id) on delete cascade,
  domain text not null,
  primary key (workflow_id, domain)
);
alter table public.workflow_domains enable row level security;

create table public.campaign_contacts (
  campaign_id uuid references public.campaigns(id) on delete cascade,
  relationship_id uuid references public.relationships(id) on delete cascade,
  primary key (campaign_id, relationship_id)
);
alter table public.campaign_contacts enable row level security;

create table public.campaign_projects (
  campaign_id uuid references public.campaigns(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  primary key (campaign_id, project_id)
);
alter table public.campaign_projects enable row level security;

create table public.playbook_workflows (
  playbook_id uuid references public.playbooks(id) on delete cascade,
  workflow_id uuid references public.workflows(id) on delete cascade,
  primary key (playbook_id, workflow_id)
);
alter table public.playbook_workflows enable row level security;

-- =========================================================================
-- RLS POLICIES — uniform pattern across all entity tables
-- team_member can read; team_member can insert; owner or admin can update/delete
-- =========================================================================
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'relationships','workflows','workflow_states','projects','tasks',
      'personas','playbooks','missions','journeys','components','outcomes',
      'quests','sparks','documents','sessions','delegation','decisions',
      'campaigns','domain_assessments'
    ])
  loop
    execute format('create policy "team read" on public.%I for select to authenticated using (public.is_team_member(auth.uid()));', t);
    execute format('create policy "team insert" on public.%I for insert to authenticated with check (public.is_team_member(auth.uid()) and created_by = auth.uid());', t);
    execute format('create policy "owner or admin update" on public.%I for update to authenticated using (created_by = auth.uid() or public.has_role(auth.uid(),''admin''));', t);
    execute format('create policy "owner or admin delete" on public.%I for delete to authenticated using (created_by = auth.uid() or public.has_role(auth.uid(),''admin''));', t);
  end loop;

  -- linkage tables: team can read/write all
  for t in
    select unnest(array[
      'session_deliverables','session_components','workflow_components',
      'workflow_domains','campaign_contacts','campaign_projects','playbook_workflows'
    ])
  loop
    execute format('create policy "team read" on public.%I for select to authenticated using (public.is_team_member(auth.uid()));', t);
    execute format('create policy "team write" on public.%I for all to authenticated using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));', t);
  end loop;
end $$;
