CREATE TABLE public.domain_curators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'curator',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  UNIQUE (domain_id, operator_id, role)
);
CREATE INDEX idx_domain_curators_domain ON public.domain_curators(domain_id);
CREATE INDEX idx_domain_curators_operator ON public.domain_curators(operator_id);

CREATE TABLE public.tenet_curators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenet_id uuid NOT NULL REFERENCES public.tenets(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'curator',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  UNIQUE (tenet_id, operator_id, role)
);
CREATE INDEX idx_tenet_curators_tenet ON public.tenet_curators(tenet_id);
CREATE INDEX idx_tenet_curators_operator ON public.tenet_curators(operator_id);

CREATE TABLE public.lens_curators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_id uuid NOT NULL REFERENCES public.lenses(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'curator',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  UNIQUE (lens_id, operator_id, role)
);
CREATE INDEX idx_lens_curators_lens ON public.lens_curators(lens_id);
CREATE INDEX idx_lens_curators_operator ON public.lens_curators(operator_id);

ALTER TABLE public.domain_curators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenet_curators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lens_curators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read domain_curators" ON public.domain_curators FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write domain_curators" ON public.domain_curators FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read tenet_curators" ON public.tenet_curators FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write tenet_curators" ON public.tenet_curators FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "team read lens_curators" ON public.lens_curators FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write lens_curators" ON public.lens_curators FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_operator ON public.campaigns(operator_id);

CREATE TABLE public.entity_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind text NOT NULL,
  subject_id uuid NOT NULL,
  field text,
  old_value jsonb,
  new_value jsonb,
  change_type text NOT NULL DEFAULT 'update',
  source text NOT NULL DEFAULT 'human',
  operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  agent_run_id uuid,
  model text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX idx_audit_subject ON public.entity_audit_log(subject_kind, subject_id, created_at DESC);
CREATE INDEX idx_audit_run ON public.entity_audit_log(agent_run_id);

ALTER TABLE public.entity_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read audit" ON public.entity_audit_log FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team insert audit" ON public.entity_audit_log FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));

CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  cadence text,
  status text NOT NULL DEFAULT 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  proposals_count int NOT NULL DEFAULT 0,
  notes text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX idx_agent_runs_operator ON public.agent_runs(operator_id, created_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read agent_runs" ON public.agent_runs FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write agent_runs" ON public.agent_runs FOR ALL USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));