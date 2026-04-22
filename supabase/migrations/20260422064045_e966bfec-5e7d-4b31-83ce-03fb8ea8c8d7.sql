-- Add operator assignment columns to projects, components, sessions
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL;

ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS responsible_operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_operator_id ON public.projects(operator_id);
CREATE INDEX IF NOT EXISTS idx_components_responsible_operator_id ON public.components(responsible_operator_id);
CREATE INDEX IF NOT EXISTS idx_sessions_operator_id ON public.sessions(operator_id);