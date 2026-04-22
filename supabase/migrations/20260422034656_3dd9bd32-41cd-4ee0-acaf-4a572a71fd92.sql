-- =========================================================
-- Phase 2.6 — Capture upgrade: storage bucket, attachments table, tag columns
-- =========================================================

-- 1. Private storage bucket for capture uploads
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

-- Storage RLS policies on storage.objects scoped to the captures bucket
drop policy if exists "captures team read"   on storage.objects;
drop policy if exists "captures team insert" on storage.objects;
drop policy if exists "captures owner delete" on storage.objects;

create policy "captures team read"
  on storage.objects for select to authenticated
  using (bucket_id = 'captures' and public.is_team_member(auth.uid()));

create policy "captures team insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'captures' and public.is_team_member(auth.uid()) and owner = auth.uid());

create policy "captures owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'captures' and (owner = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role)));

-- 2. capture_attachments table
create table if not exists public.capture_attachments (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid references public.proposals(id) on delete set null,
  entity_table    text,
  entity_id       uuid,
  storage_path    text not null,
  mime_type       text,
  size_bytes      bigint,
  original_name   text not null,
  created_by      uuid not null default auth.uid(),
  created_at      timestamptz not null default now()
);

create index if not exists capture_attachments_proposal_idx on public.capture_attachments(proposal_id);
create index if not exists capture_attachments_entity_idx on public.capture_attachments(entity_table, entity_id);

alter table public.capture_attachments enable row level security;

drop policy if exists "team read attachments"        on public.capture_attachments;
drop policy if exists "team insert attachments"      on public.capture_attachments;
drop policy if exists "owner update attachments"     on public.capture_attachments;
drop policy if exists "owner or admin delete attach" on public.capture_attachments;

create policy "team read attachments"
  on public.capture_attachments for select to authenticated
  using (public.is_team_member(auth.uid()));

create policy "team insert attachments"
  on public.capture_attachments for insert to authenticated
  with check (public.is_team_member(auth.uid()) and created_by = auth.uid());

create policy "owner update attachments"
  on public.capture_attachments for update to authenticated
  using (created_by = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

create policy "owner or admin delete attach"
  on public.capture_attachments for delete to authenticated
  using (created_by = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Tag columns on proposals
alter table public.proposals
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

-- 4. Tag columns on entity tables that don't already have them
alter table public.tasks
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.projects
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.campaigns
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.sessions
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.documents
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.decisions
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.delegation
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.outcomes
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.missions
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.playbooks
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.personas
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';

alter table public.relationships
  add column if not exists tagged_domains    text[] not null default '{}',
  add column if not exists tagged_tenets     text[] not null default '{}',
  add column if not exists tagged_components uuid[] not null default '{}';
