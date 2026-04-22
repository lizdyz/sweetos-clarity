-- Task dependencies table
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  depends_on_task_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'blocks' CHECK (kind IN ('blocks','related')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  CONSTRAINT task_dependencies_unique UNIQUE (task_id, depends_on_task_id, kind),
  CONSTRAINT task_dependencies_no_self CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON public.task_dependencies(depends_on_task_id);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read task_dependencies"
  ON public.task_dependencies FOR SELECT TO authenticated
  USING (is_team_member(auth.uid()));

CREATE POLICY "team insert task_dependencies"
  ON public.task_dependencies FOR INSERT TO authenticated
  WITH CHECK (is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "owner or admin delete task_dependencies"
  ON public.task_dependencies FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Add assignee_id to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);

-- Derived blocked flag (regular column kept in sync via trigger; generated columns can't reference other rows)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.recompute_task_blocked(_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tasks t
  SET blocked = (
    COALESCE(NULLIF(trim(t.waiting_on), ''), NULL) IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM public.task_dependencies d
      JOIN public.tasks bt ON bt.id = d.depends_on_task_id
      WHERE d.task_id = t.id
        AND d.kind = 'blocks'
        AND COALESCE(bt.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived')
    )
  )
  WHERE t.id = _task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_task_dep_recompute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_task_blocked(OLD.task_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_task_blocked(NEW.task_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS task_dep_recompute_aiud ON public.task_dependencies;
CREATE TRIGGER task_dep_recompute_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.task_dependencies
FOR EACH ROW EXECUTE FUNCTION public.trg_task_dep_recompute();

CREATE OR REPLACE FUNCTION public.trg_task_self_recompute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.blocked := (
    COALESCE(NULLIF(trim(NEW.waiting_on), ''), NULL) IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM public.task_dependencies d
      JOIN public.tasks bt ON bt.id = d.depends_on_task_id
      WHERE d.task_id = NEW.id
        AND d.kind = 'blocks'
        AND COALESCE(bt.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_self_recompute_biu ON public.tasks;
CREATE TRIGGER task_self_recompute_biu
BEFORE INSERT OR UPDATE OF waiting_on, status ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.trg_task_self_recompute();

-- When a blocker task's status changes, recompute dependents
CREATE OR REPLACE FUNCTION public.trg_task_status_propagate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') IS DISTINCT FROM COALESCE(NEW.status,'') THEN
    PERFORM public.recompute_task_blocked(d.task_id)
    FROM public.task_dependencies d
    WHERE d.depends_on_task_id = NEW.id AND d.kind = 'blocks';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_status_propagate_au ON public.tasks;
CREATE TRIGGER task_status_propagate_au
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.trg_task_status_propagate();

-- task_blockers view
CREATE OR REPLACE VIEW public.task_blockers AS
SELECT
  d.task_id,
  d.depends_on_task_id AS blocker_task_id,
  bt.name AS blocker_name,
  bt.status AS blocker_status
FROM public.task_dependencies d
JOIN public.tasks bt ON bt.id = d.depends_on_task_id
WHERE d.kind = 'blocks';

GRANT SELECT ON public.task_blockers TO authenticated;