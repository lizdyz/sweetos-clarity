-- Operators: a unit that does work — human, workflow, or AI agent
DO $$ BEGIN
  CREATE TYPE public.operator_kind AS ENUM ('human','workflow','agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind public.operator_kind NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  workflow_id uuid,
  agent_model text,
  agent_system_prompt text,
  skills text[] NOT NULL DEFAULT '{}',
  likes text[] NOT NULL DEFAULT '{}',
  dislikes text[] NOT NULL DEFAULT '{}',
  availability text NOT NULL DEFAULT 'available',
  notes text,
  avatar_url text,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operators_kind_idx ON public.operators(kind);
CREATE INDEX IF NOT EXISTS operators_profile_idx ON public.operators(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS operators_unique_profile ON public.operators(profile_id) WHERE profile_id IS NOT NULL;

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team read operators" ON public.operators;
CREATE POLICY "team read operators" ON public.operators FOR SELECT TO authenticated USING (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "team insert operators" ON public.operators;
CREATE POLICY "team insert operators" ON public.operators FOR INSERT TO authenticated WITH CHECK (is_team_member(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "owner or admin update operators" ON public.operators;
CREATE POLICY "owner or admin update operators" ON public.operators FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "owner or admin delete operators" ON public.operators;
CREATE POLICY "owner or admin delete operators" ON public.operators FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE TRIGGER operators_set_updated_at BEFORE UPDATE ON public.operators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill: one operator per existing profile
INSERT INTO public.operators (name, kind, profile_id, created_by)
SELECT COALESCE(p.display_name, 'Unnamed'), 'human'::public.operator_kind, p.id, p.id
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.operators o WHERE o.profile_id = p.id);

-- Add tasks.operator_id (canonical) — keep assignee_id for back-compat
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_operator_idx ON public.tasks(operator_id);

-- Backfill tasks.operator_id from existing assignee_id where possible
UPDATE public.tasks t
SET operator_id = o.id
FROM public.operators o
WHERE t.operator_id IS NULL AND t.assignee_id IS NOT NULL AND o.profile_id = t.assignee_id;

-- View: operator_workload — single source for People + Flightdeck
CREATE OR REPLACE VIEW public.operator_workload AS
SELECT
  o.id AS operator_id,
  o.name,
  o.kind,
  o.avatar_url,
  o.availability,
  o.skills,
  o.enabled,
  COALESCE(SUM(CASE WHEN COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived') THEN 1 ELSE 0 END), 0)::int AS open_tasks,
  COALESCE(SUM(CASE WHEN t.blocked AND COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived') THEN 1 ELSE 0 END), 0)::int AS blocked_tasks,
  COALESCE(SUM(CASE WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived') THEN 1 ELSE 0 END), 0)::int AS overdue_tasks,
  MIN(CASE WHEN t.due_date IS NOT NULL AND COALESCE(t.status,'') NOT IN ('Done','Complete','Completed','Cancelled','Canceled','Archived') THEN t.due_date END) AS next_due
FROM public.operators o
LEFT JOIN public.tasks t ON t.operator_id = o.id
GROUP BY o.id, o.name, o.kind, o.avatar_url, o.availability, o.skills, o.enabled;

GRANT SELECT ON public.operator_workload TO authenticated;