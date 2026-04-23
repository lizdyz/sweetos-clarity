-- 1. Schema additions
alter table public.entity_canon
  add column if not exists parent_kinds text[] not null default '{}',
  add column if not exists child_kinds text[] not null default '{}',
  add column if not exists peer_kinds text[] not null default '{}',
  add column if not exists composition_notes text;

-- 2. Seed three missing entity kinds
insert into public.entity_canon (entity_kind, display_name, one_liner, status)
values
  ('jtbd', 'JTBD', 'A standard job a persona is hired to do; work instances (campaigns/projects/tasks) advance JTBDs.', 'defined'),
  ('persona', 'Persona', 'A canonical role/archetype we serve. Owns its own JTBD library.', 'defined'),
  ('campaign', 'Campaign', 'A coordinated set of projects/tasks aimed at a goal for one or more relationships.', 'defined')
on conflict (entity_kind) do nothing;

-- 3. Backfill graph edges (idempotent — overwrites with declared truth)
update public.entity_canon set parent_kinds = '{}', child_kinds = '{}', peer_kinds = '{}' where parent_kinds is null or child_kinds is null or peer_kinds is null;

update public.entity_canon set parent_kinds = array['relationship','engagement_plan'], child_kinds = array['session','outcome'], peer_kinds = array['campaign'] where entity_kind = 'project';
update public.entity_canon set parent_kinds = array['project','campaign'], child_kinds = array[]::text[], peer_kinds = array['outcome','decision'], composition_notes = 'A Task can also stand alone with no parent project.' where entity_kind = 'task';
update public.entity_canon set parent_kinds = array['relationship'], child_kinds = array['project','session'], peer_kinds = array['mission'] where entity_kind = 'campaign';
update public.entity_canon set parent_kinds = array['relationship'], child_kinds = array['spark','outcome'], peer_kinds = array['mission','journey'] where entity_kind = 'quest';
update public.entity_canon set parent_kinds = array['quest'], child_kinds = array[]::text[], peer_kinds = array['component'] where entity_kind = 'spark';
update public.entity_canon set parent_kinds = array['journey'], child_kinds = array[]::text[], peer_kinds = array['domain','tenet'] where entity_kind = 'component';
update public.entity_canon set parent_kinds = array[]::text[], child_kinds = array['component'], peer_kinds = array['mission'] where entity_kind = 'journey';
update public.entity_canon set parent_kinds = array['relationship'], child_kinds = array['journey','quest'], peer_kinds = array[]::text[] where entity_kind = 'mission';
update public.entity_canon set parent_kinds = array['session_template'], child_kinds = array['outcome','spark'], peer_kinds = array['quest'] where entity_kind = 'session';
update public.entity_canon set parent_kinds = array[]::text[], child_kinds = array['campaign','project','session','quest','mission'], peer_kinds = array['persona'] where entity_kind = 'relationship';
update public.entity_canon set parent_kinds = array[]::text[], child_kinds = array['component'], peer_kinds = array['tenet'] where entity_kind = 'domain';
update public.entity_canon set parent_kinds = array['domain'], child_kinds = array[]::text[], peer_kinds = array['component'] where entity_kind = 'tenet';
update public.entity_canon set parent_kinds = array[]::text[], child_kinds = array[]::text[], peer_kinds = array['task','project'] where entity_kind = 'operator';
update public.entity_canon set parent_kinds = array['quest','mission','session','task'], child_kinds = array[]::text[], peer_kinds = array['decision'] where entity_kind = 'outcome';
update public.entity_canon set parent_kinds = array[]::text[], child_kinds = array[]::text[], peer_kinds = array['task','workflow'] where entity_kind = 'workflow';
update public.entity_canon set parent_kinds = array['persona'], child_kinds = array['campaign','project','task'], peer_kinds = array['component'], composition_notes = 'JTBDs are the role''s standard jobs. Campaigns/projects/tasks are work instances that advance them.' where entity_kind = 'jtbd';
update public.entity_canon set parent_kinds = array[]::text[], child_kinds = array['jtbd'], peer_kinds = array['relationship'] where entity_kind = 'persona';