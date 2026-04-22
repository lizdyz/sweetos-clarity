-- UX Auditor: persistent audit runs
CREATE TABLE public.ux_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path text NOT NULL,
  source_path text,
  audited_at timestamptz NOT NULL DEFAULT now(),
  audited_by uuid,
  model text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  guardrails_missing text[] NOT NULL DEFAULT ARRAY[]::text[],
  ux_issues_user_reported text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','fixed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ux_audit_runs_route ON public.ux_audit_runs(route_path, audited_at DESC);
CREATE INDEX idx_ux_audit_runs_status ON public.ux_audit_runs(status);

ALTER TABLE public.ux_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view ux audit runs"
ON public.ux_audit_runs FOR SELECT
TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert ux audit runs"
ON public.ux_audit_runs FOR INSERT
TO authenticated
WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can update ux audit runs"
ON public.ux_audit_runs FOR UPDATE
TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can delete ux audit runs"
ON public.ux_audit_runs FOR DELETE
TO authenticated
USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_ux_audit_runs_updated
BEFORE UPDATE ON public.ux_audit_runs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();