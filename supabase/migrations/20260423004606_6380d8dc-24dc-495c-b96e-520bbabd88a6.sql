do $$ begin
  if not exists (select 1 from pg_type where typname = 'handoff_status') then
    create type public.handoff_status as enum ('pending','accepted','declined','cancelled','auto_completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'handoff_reason') then
    create type public.handoff_reason as enum ('ready_for_review','blocked','escalation','fyi','reassign');
  end if;
end $$;

create table if not exists public.handoff_events (
  id uuid primary key default gen_random_uuid(),
  from_operator_id uuid references public.operators(id) on delete set null,
  to_operator_id   uuid not null references public.operators(id) on delete cascade,
  subject_kind text not null check (subject_kind in ('task','workflow_step_run','session','project','campaign')),
  subject_id   uuid not null,
  reason public.handoff_reason not null default 'ready_for_review',
  status public.handoff_status not null default 'pending',
  note text,
  due_date date,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  created_by uuid references auth.users(id)
);

alter table public.handoff_events enable row level security;

drop policy if exists "team can read handoffs"   on public.handoff_events;
drop policy if exists "team can write handoffs"  on public.handoff_events;
drop policy if exists "team can update handoffs" on public.handoff_events;

create policy "team can read handoffs"
  on public.handoff_events for select
  using (public.is_team_member(auth.uid()));

create policy "team can write handoffs"
  on public.handoff_events for insert
  with check (public.is_team_member(auth.uid()));

create policy "team can update handoffs"
  on public.handoff_events for update
  using (public.is_team_member(auth.uid()));

create index if not exists handoff_events_to_status_idx on public.handoff_events (to_operator_id, status, created_at desc);
create index if not exists handoff_events_from_idx     on public.handoff_events (from_operator_id, created_at desc);
create index if not exists handoff_events_subject_idx  on public.handoff_events (subject_kind, subject_id);

create or replace view public.operator_handoff_inbox as
select
  he.id,
  he.from_operator_id,
  he.to_operator_id,
  he.subject_kind,
  he.subject_id,
  he.reason,
  he.status,
  he.note,
  he.due_date,
  he.created_at,
  he.responded_at,
  he.created_by,
  case he.subject_kind
    when 'task'     then (select t.name from public.tasks t where t.id = he.subject_id)
    when 'project'  then (select p.name from public.projects p where p.id = he.subject_id)
    when 'campaign' then (select c.campaign_name from public.campaigns c where c.id = he.subject_id)
    when 'session'  then (select coalesce(se.name, 'Session') from public.sessions se where se.id = he.subject_id)
    when 'workflow_step_run' then (
      select s.name
      from public.workflow_steps s
      join public.workflow_step_runs r on r.step_id = s.id
      where r.id = he.subject_id
    )
  end as subject_label
from public.handoff_events he;