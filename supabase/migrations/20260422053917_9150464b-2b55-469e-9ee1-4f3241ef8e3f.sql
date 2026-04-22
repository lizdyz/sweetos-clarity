
-- =========================================================
-- 1. NEW ENUM: contribution type for project_components
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.component_contribution_type AS ENUM (
    'Builds', 'Refines', 'Tests', 'Documents', 'Retires'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2. NEW TABLES: project_components, task_components
-- =========================================================
CREATE TABLE IF NOT EXISTS public.project_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  contribution_type public.component_contribution_type NOT NULL DEFAULT 'Builds',
  target_maturity_level public.maturity_level,
  target_date date,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_project_components_project ON public.project_components(project_id);
CREATE INDEX IF NOT EXISTS idx_project_components_component ON public.project_components(component_id);

ALTER TABLE public.project_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read project_components" ON public.project_components
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert project_components" ON public.project_components
  FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "owner or admin update project_components" ON public.project_components
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "owner or admin delete project_components" ON public.project_components
  FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER set_updated_at_project_components
  BEFORE UPDATE ON public.project_components
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE IF NOT EXISTS public.task_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_task_components_task ON public.task_components(task_id);
CREATE INDEX IF NOT EXISTS idx_task_components_component ON public.task_components(component_id);

ALTER TABLE public.task_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read task_components" ON public.task_components
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert task_components" ON public.task_components
  FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "owner or admin delete task_components" ON public.task_components
  FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));


-- =========================================================
-- 3. NEW TIME COLUMNS on six tables
-- =========================================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS scheduled_for date,
  ADD COLUMN IF NOT EXISTS not_before date,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS scheduled_for date,
  ADD COLUMN IF NOT EXISTS not_before date,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.sparks
  ADD COLUMN IF NOT EXISTS scheduled_for date,
  ADD COLUMN IF NOT EXISTS not_before date,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.sparks(id) ON DELETE SET NULL;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS scheduled_for date,
  ADD COLUMN IF NOT EXISTS not_before date,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS scheduled_for date,
  ADD COLUMN IF NOT EXISTS not_before date,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.engagement_services
  ADD COLUMN IF NOT EXISTS scheduled_for date,
  ADD COLUMN IF NOT EXISTS not_before date,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.engagement_services(id) ON DELETE SET NULL;


-- =========================================================
-- 4. next_recurrence(rule, anchor) — simple RRULE evaluator
-- =========================================================
CREATE OR REPLACE FUNCTION public.next_recurrence(_rule text, _anchor date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _freq text;
  _interval int := 1;
  _part text;
BEGIN
  IF _rule IS NULL OR trim(_rule) = '' OR _anchor IS NULL THEN
    RETURN NULL;
  END IF;

  FOREACH _part IN ARRAY string_to_array(upper(_rule), ';') LOOP
    IF _part LIKE 'FREQ=%' THEN
      _freq := substring(_part FROM 6);
    ELSIF _part LIKE 'INTERVAL=%' THEN
      _interval := COALESCE(NULLIF(substring(_part FROM 10), '')::int, 1);
    END IF;
  END LOOP;

  IF _freq = 'DAILY' THEN
    RETURN _anchor + (_interval || ' days')::interval;
  ELSIF _freq = 'WEEKLY' THEN
    RETURN _anchor + (_interval || ' weeks')::interval;
  ELSIF _freq = 'MONTHLY' THEN
    RETURN _anchor + (_interval || ' months')::interval;
  ELSIF _freq = 'YEARLY' THEN
    RETURN _anchor + (_interval || ' years')::interval;
  END IF;

  RETURN NULL;
END;
$$;


-- =========================================================
-- 5. Recurrence trigger — auto-create next task instance on done
-- =========================================================
CREATE OR REPLACE FUNCTION public.trg_task_recurrence_spawn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_due date;
  _next_sched date;
  _new_id uuid;
BEGIN
  IF NEW.recurrence_rule IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(OLD.status,'') = COALESCE(NEW.status,'') THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('Done','Complete','Completed') THEN RETURN NEW; END IF;

  _next_due := public.next_recurrence(NEW.recurrence_rule, COALESCE(NEW.due_date, CURRENT_DATE));
  _next_sched := public.next_recurrence(NEW.recurrence_rule, COALESCE(NEW.scheduled_for, CURRENT_DATE));

  -- avoid spawning if a child for this parent already exists with same due
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE recurrence_parent_id = COALESCE(NEW.recurrence_parent_id, NEW.id)
      AND due_date IS NOT DISTINCT FROM _next_due
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tasks (
    name, description, status, priority, owner, assignee_id,
    relationship_id, project_id,
    due_date, scheduled_for, not_before,
    recurrence_rule, recurrence_parent_id,
    tagged_domains, tagged_tenets, tagged_components,
    created_by
  )
  VALUES (
    NEW.name, NEW.description, 'To Do', NEW.priority, NEW.owner, NEW.assignee_id,
    NEW.relationship_id, NEW.project_id,
    _next_due, _next_sched, NULL,
    NEW.recurrence_rule, COALESCE(NEW.recurrence_parent_id, NEW.id),
    NEW.tagged_domains, NEW.tagged_tenets, NEW.tagged_components,
    NEW.created_by
  )
  RETURNING id INTO _new_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_recurrence_spawn ON public.tasks;
CREATE TRIGGER task_recurrence_spawn
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_task_recurrence_spawn();


-- =========================================================
-- 6. time_grid view — every actionable record in one shape
-- =========================================================
CREATE OR REPLACE VIEW public.time_grid AS
SELECT
  'task'::text AS entity_type, t.id AS entity_id, t.name,
  t.due_date, t.scheduled_for, t.not_before,
  CASE WHEN t.status IN ('Done','Complete','Completed') THEN t.updated_at ELSE NULL END AS done_at,
  t.relationship_id, t.recurrence_rule, t.status
FROM public.tasks t
UNION ALL
SELECT
  'project'::text, p.id, p.name,
  p.deadline, p.scheduled_for, p.not_before,
  CASE WHEN p.status IN ('Done','Complete','Completed','Shipped') THEN p.updated_at ELSE NULL END,
  p.relationship_id, p.recurrence_rule, p.status
FROM public.projects p
UNION ALL
SELECT
  'session'::text, s.id, s.name,
  NULL::date, s.scheduled_for, s.not_before,
  CASE WHEN s.status IN ('Done','Completed','Shipped') THEN s.updated_at ELSE NULL END,
  s.relationship_id, s.recurrence_rule, s.status
FROM public.sessions s
UNION ALL
SELECT
  'spark'::text, sp.id, sp.name,
  NULL::date, sp.scheduled_for, sp.not_before,
  sp.done_at,
  NULL::uuid, sp.recurrence_rule, NULL::text
FROM public.sparks sp
UNION ALL
SELECT
  'campaign'::text, c.id, c.campaign_name,
  c.deadline, c.scheduled_for, c.not_before,
  CASE WHEN c.status IN ('Done','Complete','Completed','Shipped') THEN c.updated_at ELSE NULL END,
  NULL::uuid, c.recurrence_rule, c.status
FROM public.campaigns c;


-- =========================================================
-- 7. component_build_pipeline view
-- =========================================================
CREATE OR REPLACE VIEW public.component_build_pipeline AS
SELECT
  c.id AS component_id,
  c.name AS component_name,
  c.current_maturity_level,
  COALESCE(
    array_agg(DISTINCT pc.project_id) FILTER (WHERE pc.project_id IS NOT NULL),
    ARRAY[]::uuid[]
  ) AS active_project_ids,
  COALESCE(
    array_agg(DISTINCT tc.task_id) FILTER (WHERE tc.task_id IS NOT NULL),
    ARRAY[]::uuid[]
  ) AS active_task_ids,
  COUNT(DISTINCT pc.project_id) AS active_project_count,
  COUNT(DISTINCT tc.task_id) AS active_task_count
FROM public.components c
LEFT JOIN public.project_components pc ON pc.component_id = c.id
LEFT JOIN public.projects p ON p.id = pc.project_id
  AND COALESCE(p.status,'') NOT IN ('Done','Complete','Completed','Shipped','Cancelled','Archived')
LEFT JOIN public.task_components tc ON tc.component_id = c.id
LEFT JOIN public.tasks t ON t.id = tc.task_id
  AND COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived')
GROUP BY c.id, c.name, c.current_maturity_level;


-- =========================================================
-- 8. work_context view — per-record interconnected context
-- =========================================================
CREATE OR REPLACE VIEW public.work_context AS
SELECT
  'task'::text AS entity_type,
  t.id AS entity_id,
  t.name,
  COALESCE(
    (SELECT array_agg(component_id) FROM public.task_components WHERE task_id = t.id),
    ARRAY[]::uuid[]
  ) AS building_components,
  t.relationship_id AS for_relationship,
  t.tagged_domains, t.tagged_tenets, t.tagged_components,
  t.due_date, t.scheduled_for, t.not_before,
  CASE WHEN t.status IN ('Done','Complete','Completed') THEN t.updated_at ELSE NULL END AS done_at,
  t.recurrence_rule,
  COALESCE(
    (SELECT array_agg(d.depends_on_task_id) FROM public.task_dependencies d WHERE d.task_id = t.id AND d.kind = 'blocks'),
    ARRAY[]::uuid[]
  ) AS blocked_by_tasks,
  COALESCE(
    (SELECT array_agg(d.task_id) FROM public.task_dependencies d WHERE d.depends_on_task_id = t.id AND d.kind = 'blocks'),
    ARRAY[]::uuid[]
  ) AS blocking_tasks,
  t.project_id AS parent_project_id,
  NULL::uuid AS parent_campaign_id,
  t.status
FROM public.tasks t
UNION ALL
SELECT
  'project'::text, p.id, p.name,
  COALESCE(
    (SELECT array_agg(component_id) FROM public.project_components WHERE project_id = p.id),
    ARRAY[]::uuid[]
  ),
  p.relationship_id,
  p.tagged_domains, p.tagged_tenets, p.tagged_components,
  p.deadline, p.scheduled_for, p.not_before,
  CASE WHEN p.status IN ('Done','Complete','Completed','Shipped') THEN p.updated_at ELSE NULL END,
  p.recurrence_rule,
  ARRAY[]::uuid[], ARRAY[]::uuid[],
  NULL::uuid,
  (SELECT cp.campaign_id FROM public.campaign_projects cp WHERE cp.project_id = p.id LIMIT 1),
  p.status
FROM public.projects p;
