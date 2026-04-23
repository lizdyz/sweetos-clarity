-- Wave 19: Audit Trail Foundation

ALTER TABLE public.entity_audit_log
  ADD COLUMN IF NOT EXISTS event_category text NOT NULL DEFAULT 'data_change'
    CHECK (event_category IN (
      'data_change','lifecycle','tag_change','relationship_change',
      'import','schema','recipe','workflow','prompt','review','exception','auth'
    )),
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','notice','warning','error','critical')),
  ADD COLUMN IF NOT EXISTS source_run_kind text,
  ADD COLUMN IF NOT EXISTS source_run_id uuid,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS diff jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS idx_audit_category_time ON public.entity_audit_log(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity_time ON public.entity_audit_log(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_time    ON public.entity_audit_log(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_source_run    ON public.entity_audit_log(source_run_kind, source_run_id);
CREATE INDEX IF NOT EXISTS idx_audit_request_id    ON public.entity_audit_log(request_id) WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_audit_log_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'entity_audit_log is append-only; UPDATE is not permitted'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_immutable_trg ON public.entity_audit_log;
CREATE TRIGGER audit_log_immutable_trg BEFORE UPDATE ON public.entity_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log_immutable();

DROP POLICY IF EXISTS "admin delete audit" ON public.entity_audit_log;
CREATE POLICY "admin delete audit" ON public.entity_audit_log FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.audit_field_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  field_name text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, field_name)
);
ALTER TABLE public.audit_field_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read field blacklist" ON public.audit_field_blacklist FOR SELECT
  USING (public.is_team_member(auth.uid()));
CREATE POLICY "admin manage field blacklist" ON public.audit_field_blacklist FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.audit_field_blacklist (table_name, field_name, reason) VALUES
  ('*', 'updated_at', 'auto-managed timestamp'),
  ('*', 'created_at', 'auto-managed timestamp'),
  ('*', 'last_reviewed', 'auto-managed timestamp')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audit_write_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  subject_kind text,
  subject_id uuid,
  event_category text,
  error_message text NOT NULL,
  payload jsonb,
  resolved_at timestamptz
);
ALTER TABLE public.audit_write_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read write failures" ON public.audit_write_failures FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "team insert write failures" ON public.audit_write_failures FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE TABLE IF NOT EXISTS public.audit_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_workspace_pinned boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read saved views" ON public.audit_saved_views FOR SELECT
  USING (public.is_team_member(auth.uid()) AND (is_workspace_pinned OR created_by = auth.uid()));
CREATE POLICY "user manage own views" ON public.audit_saved_views FOR ALL
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "admin pin views" ON public.audit_saved_views FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER audit_saved_views_updated_at BEFORE UPDATE ON public.audit_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.audit_saved_views (name, description, filters, is_workspace_pinned, created_by) VALUES
  ('Operational review', 'Last 7 days, all categories, severity ≥ info, grouped by subject',
   '{"date_range":"7d","severities":["info","notice","warning","error","critical"],"group_by":"subject_kind"}'::jsonb, true, NULL),
  ('Security & change visibility', 'Last 30 days · auth, lifecycle deletes, schema · severity ≥ warning · human source',
   '{"date_range":"30d","categories":["auth","lifecycle","schema"],"severities":["warning","error","critical"],"sources":["human"]}'::jsonb, true, NULL),
  ('Compliance traceability', 'Last 90 days · schema, import, review, prompt, exception · or tag pii',
   '{"date_range":"90d","categories":["schema","import","review","prompt","exception"],"tags_any":["pii"]}'::jsonb, true, NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.entity_audit_log_archive (LIKE public.entity_audit_log INCLUDING ALL);
ALTER TABLE public.entity_audit_log_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read archive" ON public.entity_audit_log_archive FOR SELECT
  USING (public.is_team_member(auth.uid()));
CREATE POLICY "admin manage archive" ON public.entity_audit_log_archive FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.audit_events_enriched
WITH (security_invoker = true) AS
SELECT
  a.id, a.subject_kind, a.subject_id, a.field, a.old_value, a.new_value, a.diff,
  a.change_type, a.event_category, a.severity, a.source, a.source_run_kind, a.source_run_id,
  a.operator_id, a.agent_run_id, a.model, a.notes, a.tags, a.request_id,
  a.ip_address, a.user_agent, a.created_at, a.created_by,
  p.display_name AS actor_display_name,
  op.name AS operator_name,
  CASE a.subject_kind
    WHEN 'component' THEN (SELECT name FROM public.components WHERE id = a.subject_id)
    WHEN 'journey' THEN (SELECT name FROM public.journeys WHERE id = a.subject_id)
    WHEN 'quest' THEN (SELECT name FROM public.quests WHERE id = a.subject_id)
    WHEN 'mission' THEN (SELECT name FROM public.missions WHERE id = a.subject_id)
    WHEN 'task' THEN (SELECT name FROM public.tasks WHERE id = a.subject_id)
    WHEN 'project' THEN (SELECT name FROM public.projects WHERE id = a.subject_id)
    WHEN 'decision' THEN (SELECT decision FROM public.decisions WHERE id = a.subject_id)
    WHEN 'session' THEN (SELECT name FROM public.sessions WHERE id = a.subject_id)
    WHEN 'workflow' THEN (SELECT name FROM public.workflows WHERE id = a.subject_id)
    WHEN 'operator' THEN (SELECT name FROM public.operators WHERE id = a.subject_id)
    WHEN 'relationship' THEN (SELECT name FROM public.relationships WHERE id = a.subject_id)
    WHEN 'engagement_plan' THEN (SELECT plan_name FROM public.engagement_plans WHERE id = a.subject_id)
    WHEN 'spark' THEN (SELECT name FROM public.sparks WHERE id = a.subject_id)
    ELSE NULL
  END AS subject_label
FROM public.entity_audit_log a
LEFT JOIN public.profiles p ON p.id = a.created_by
LEFT JOIN public.operators op ON op.id = a.operator_id;

CREATE OR REPLACE FUNCTION public.trg_generic_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _kind text := TG_ARGV[0];
  _table text := TG_TABLE_NAME;
  _old jsonb;
  _new jsonb;
  _key text;
  _old_val jsonb;
  _new_val jsonb;
  _subject_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _new := to_jsonb(NEW);
    _subject_id := (_new->>'id')::uuid;
    INSERT INTO public.entity_audit_log
      (subject_kind, subject_id, change_type, event_category, severity, source, new_value, notes)
    VALUES
      (_kind, _subject_id, 'create', 'lifecycle', 'info', 'human', _new, 'Record created');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _subject_id := (_old->>'id')::uuid;
    INSERT INTO public.entity_audit_log
      (subject_kind, subject_id, change_type, event_category, severity, source, old_value, notes)
    VALUES
      (_kind, _subject_id, 'delete', 'lifecycle', 'warning', 'human', _old, 'Record deleted');
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _subject_id := (_new->>'id')::uuid;
    FOR _key IN SELECT jsonb_object_keys(_new) LOOP
      _old_val := _old->_key;
      _new_val := _new->_key;
      IF _old_val IS DISTINCT FROM _new_val THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.audit_field_blacklist
          WHERE (table_name = _table OR table_name = '*') AND field_name = _key
        ) THEN
          INSERT INTO public.entity_audit_log
            (subject_kind, subject_id, field, old_value, new_value,
             change_type, event_category, severity, source)
          VALUES
            (_kind, _subject_id, _key, _old_val, _new_val,
             'update',
             CASE
               WHEN _key LIKE 'tagged_%' THEN 'tag_change'
               WHEN _key IN ('status','progression_state','current_maturity_level') THEN 'lifecycle'
               ELSE 'data_change'
             END,
             'info', 'human');
        END IF;
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.audit_write_failures (subject_kind, subject_id, event_category, error_message, payload)
  VALUES (_kind, _subject_id, 'data_change', SQLERRM, jsonb_build_object('table', _table, 'op', TG_OP));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  _t text;
  _kind text;
  _pairs text[][] := ARRAY[
    ['components','component'],
    ['journeys','journey'],
    ['quests','quest'],
    ['missions','mission'],
    ['tasks','task'],
    ['projects','project'],
    ['decisions','decision'],
    ['sessions','session'],
    ['workflows','workflow'],
    ['operators','operator'],
    ['relationships','relationship'],
    ['engagement_plans','engagement_plan']
  ];
  _i int;
BEGIN
  FOR _i IN 1..array_length(_pairs, 1) LOOP
    _t := _pairs[_i][1];
    _kind := _pairs[_i][2];
    EXECUTE format('DROP TRIGGER IF EXISTS audit_generic_trg ON public.%I', _t);
    EXECUTE format(
      'CREATE TRIGGER audit_generic_trg AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.trg_generic_audit(%L)',
      _t, _kind
    );
  END LOOP;
END $$;