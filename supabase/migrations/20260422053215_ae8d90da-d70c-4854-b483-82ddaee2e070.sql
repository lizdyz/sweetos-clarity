CREATE OR REPLACE VIEW public.recent_done_log AS
SELECT
  'task'::text AS entity_type,
  t.id AS entity_id,
  t.name AS name,
  t.updated_at AS done_at,
  t.relationship_id
FROM public.tasks t
WHERE t.status IN ('Done','Complete','Completed')
  AND t.updated_at >= now() - interval '14 days'
UNION ALL
SELECT
  'project'::text,
  p.id,
  p.name,
  p.updated_at,
  p.relationship_id
FROM public.projects p
WHERE p.status IN ('Done','Complete','Completed','Shipped')
  AND p.updated_at >= now() - interval '14 days'
UNION ALL
SELECT
  'session'::text,
  s.id,
  s.name,
  s.updated_at,
  s.relationship_id
FROM public.sessions s
WHERE s.status IN ('Done','Completed','Shipped')
  AND s.updated_at >= now() - interval '14 days'
UNION ALL
SELECT
  'spark'::text,
  sp.id,
  sp.name,
  COALESCE(sp.done_at, sp.updated_at),
  NULL::uuid
FROM public.sparks sp
WHERE sp.done_at IS NOT NULL
  AND sp.done_at >= now() - interval '14 days'
UNION ALL
SELECT
  'outcome'::text,
  o.id,
  COALESCE(o.description, o.outcome_type),
  COALESCE(o.done_at, o.updated_at),
  o.client_id
FROM public.outcomes o
WHERE o.done_at IS NOT NULL
  AND o.done_at >= now() - interval '14 days';

CREATE OR REPLACE FUNCTION public.seed_excellence_defaults(
  _subject_kind public.excellence_subject_kind,
  _subject_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _level public.maturity_level;
  _perspective record;
  _total integer := 0;
  _rc integer;
  _levels public.maturity_level[] := ARRAY[
    'L1 Lacking'::public.maturity_level,
    'L2 Learning'::public.maturity_level,
    'L3 Launching'::public.maturity_level,
    'L4 Leveraging'::public.maturity_level,
    'L5 Leading'::public.maturity_level
  ];
BEGIN
  FOREACH _level IN ARRAY _levels LOOP
    FOR _perspective IN
      SELECT id FROM public.excellence_perspectives WHERE enabled = true ORDER BY sort_order
    LOOP
      INSERT INTO public.excellence_rubric (subject_kind, subject_id, level, perspective_id, checklist_items, enabled)
      SELECT _subject_kind, _subject_id, _level, _perspective.id, ARRAY[]::text[], true
      WHERE NOT EXISTS (
        SELECT 1 FROM public.excellence_rubric
        WHERE subject_kind = _subject_kind
          AND subject_id = _subject_id
          AND level = _level
          AND perspective_id = _perspective.id
      );
      GET DIAGNOSTICS _rc = ROW_COUNT;
      _total := _total + _rc;
    END LOOP;
  END LOOP;
  RETURN _total;
END;
$$;