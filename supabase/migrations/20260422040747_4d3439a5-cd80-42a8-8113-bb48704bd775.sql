-- 5 Ps lookup (perspectives that interrogate each subject)
create table if not exists public.excellence_perspectives (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- P1..P5
  name text not null,
  description text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.excellence_perspectives enable row level security;

create policy "team read perspectives" on public.excellence_perspectives
  for select to authenticated using (is_team_member(auth.uid()));
create policy "admins manage perspectives" on public.excellence_perspectives
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create trigger perspectives_updated_at before update on public.excellence_perspectives
  for each row execute function public.set_updated_at();

insert into public.excellence_perspectives (code, name, description, sort_order) values
  ('P1', 'Purpose',     'Why it exists and the outcome it must produce', 1),
  ('P2', 'People',      'Who is involved and the roles they play',       2),
  ('P3', 'Process',     'How the work is done, repeatedly and reliably', 3),
  ('P4', 'Performance', 'How quality and results are measured',          4),
  ('P5', 'Progress',    'How it learns, adapts, and compounds over time',5)
on conflict (code) do nothing;

-- Subject kind enum
do $$ begin
  create type public.excellence_subject_kind as enum ('domain', 'tenet', 'component');
exception when duplicate_object then null; end $$;

-- The matrix row
create table if not exists public.excellence_rubric (
  id uuid primary key default gen_random_uuid(),
  subject_kind public.excellence_subject_kind not null,
  subject_id uuid not null,
  level public.maturity_level not null,
  perspective_id uuid not null references public.excellence_perspectives(id) on delete cascade,
  excellence_definition text,
  checklist_items text[] not null default '{}',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (subject_kind, subject_id, level, perspective_id)
);

create index if not exists idx_excellence_rubric_subject
  on public.excellence_rubric(subject_kind, subject_id);
create index if not exists idx_excellence_rubric_perspective
  on public.excellence_rubric(perspective_id);

alter table public.excellence_rubric enable row level security;

create policy "team read excellence_rubric" on public.excellence_rubric
  for select to authenticated using (is_team_member(auth.uid()));
create policy "admins manage excellence_rubric" on public.excellence_rubric
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create trigger excellence_rubric_updated_at before update on public.excellence_rubric
  for each row execute function public.set_updated_at();

-- Per-relationship score state
do $$ begin
  create type public.excellence_score_state as enum ('not_assessed', 'not_met', 'partial', 'met');
exception when duplicate_object then null; end $$;

create table if not exists public.excellence_scores (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  rubric_id uuid not null references public.excellence_rubric(id) on delete cascade,
  state public.excellence_score_state not null default 'not_assessed',
  notes text,
  assessed_at timestamptz not null default now(),
  assessed_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (relationship_id, rubric_id)
);

create index if not exists idx_excellence_scores_rel
  on public.excellence_scores(relationship_id);
create index if not exists idx_excellence_scores_rubric
  on public.excellence_scores(rubric_id);

alter table public.excellence_scores enable row level security;

create policy "team read excellence_scores" on public.excellence_scores
  for select to authenticated using (is_team_member(auth.uid()));
create policy "team insert excellence_scores" on public.excellence_scores
  for insert to authenticated
  with check (is_team_member(auth.uid()) and assessed_by = auth.uid());
create policy "owner or admin update excellence_scores" on public.excellence_scores
  for update to authenticated
  using (assessed_by = auth.uid() or has_role(auth.uid(), 'admin'::app_role));
create policy "owner or admin delete excellence_scores" on public.excellence_scores
  for delete to authenticated
  using (assessed_by = auth.uid() or has_role(auth.uid(), 'admin'::app_role));

create trigger excellence_scores_updated_at before update on public.excellence_scores
  for each row execute function public.set_updated_at();

-- Add suggestion confidence map to proposals (optional, for AI auto-tag UX)
alter table public.proposals
  add column if not exists tag_suggestions jsonb not null default '{}'::jsonb;
