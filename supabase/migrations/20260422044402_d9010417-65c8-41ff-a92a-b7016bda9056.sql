-- Fix security_invoker on view
ALTER VIEW public.task_blockers SET (security_invoker = on);

-- Project relationship link
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.relationships(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_relationship ON public.projects(relationship_id);

-- project_rollup view
CREATE OR REPLACE VIEW public.project_rollup AS
SELECT
  p.id AS project_id,
  COUNT(t.id)::int AS total_tasks,
  COUNT(t.id) FILTER (WHERE COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived'))::int AS open_tasks,
  COUNT(t.id) FILTER (WHERE t.blocked = true AND COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived'))::int AS blocked_tasks,
  COUNT(t.id) FILTER (WHERE t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived'))::int AS overdue_tasks,
  MIN(t.due_date) FILTER (WHERE t.due_date IS NOT NULL AND COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived')) AS next_due_date,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT COALESCE(NULLIF(t.owner,''), NULL)), NULL) AS owners
FROM public.projects p
LEFT JOIN public.tasks t ON t.project_id = p.id
GROUP BY p.id;

ALTER VIEW public.project_rollup SET (security_invoker = on);
GRANT SELECT ON public.project_rollup TO authenticated;