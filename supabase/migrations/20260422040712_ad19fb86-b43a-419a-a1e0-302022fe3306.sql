-- Industries table
create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.industries enable row level security;

create policy "team read industries" on public.industries
  for select to authenticated using (is_team_member(auth.uid()));

create policy "admins manage industries" on public.industries
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create trigger industries_updated_at before update on public.industries
  for each row execute function public.set_updated_at();

-- Seed canonical industries
insert into public.industries (name, slug, sort_order) values
  ('Financial Advisory', 'financial-advisory', 1),
  ('Legal', 'legal', 2),
  ('Accounting', 'accounting', 3),
  ('Coaching', 'coaching', 4),
  ('Consulting', 'consulting', 5),
  ('Other', 'other', 99)
on conflict (slug) do nothing;

-- Add industry_id to tenets (nullable = universal)
alter table public.tenets
  add column if not exists industry_id uuid references public.industries(id) on delete set null;

create index if not exists idx_tenets_industry on public.tenets(industry_id);

-- Backfill: existing tenets become Financial Advisory scoped
update public.tenets t
  set industry_id = (select id from public.industries where slug = 'financial-advisory')
  where t.industry_id is null;

-- Add industry_id to relationships
alter table public.relationships
  add column if not exists industry_id uuid references public.industries(id) on delete set null;

create index if not exists idx_relationships_industry on public.relationships(industry_id);

-- Best-effort backfill from free-text industry column
update public.relationships r
  set industry_id = i.id
  from public.industries i
  where r.industry_id is null
    and r.industry is not null
    and lower(trim(r.industry)) = lower(i.name);
