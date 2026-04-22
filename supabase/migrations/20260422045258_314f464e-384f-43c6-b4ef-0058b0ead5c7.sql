-- Phase owner enum
DO $$ BEGIN
  CREATE TYPE public.phase_owner AS ENUM ('client', 'us', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Portal kind enum
DO $$ BEGIN
  CREATE TYPE public.portal_kind AS ENUM (
    'Pre-Engagement','Pre-Mirror','Mirror Output','Pre-Map','Map Output','Pre-Machine','Machine Output','Sync','Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sessions: add journey/phase fields
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS engagement_service_id uuid REFERENCES public.engagement_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phase_owner public.phase_owner,
  ADD COLUMN IF NOT EXISTS phase_due_date date,
  ADD COLUMN IF NOT EXISTS phase_blocker text;

CREATE INDEX IF NOT EXISTS idx_ses_engagement_service ON public.sessions(engagement_service_id);
CREATE INDEX IF NOT EXISTS idx_ses_phase_owner ON public.sessions(phase_owner);

-- Phase->owner default function
CREATE OR REPLACE FUNCTION public.default_phase_owner(_phase sweetcycle_phase)
RETURNS public.phase_owner
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _phase
    WHEN 'Seed' THEN 'client'::public.phase_owner
    WHEN 'Synthesize' THEN 'us'::public.phase_owner
    WHEN 'Session' THEN 'both'::public.phase_owner
    WHEN 'Sync' THEN 'us'::public.phase_owner
    WHEN 'Ship' THEN 'us'::public.phase_owner
    ELSE NULL
  END;
$$;

-- Trigger: auto-set phase_owner when phase changes (only if owner not explicitly set)
CREATE OR REPLACE FUNCTION public.trg_session_phase_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sweetcycle_phase IS NOT NULL AND (
    TG_OP = 'INSERT' OR OLD.sweetcycle_phase IS DISTINCT FROM NEW.sweetcycle_phase
  ) THEN
    NEW.phase_owner := COALESCE(NEW.phase_owner, public.default_phase_owner(NEW.sweetcycle_phase));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_phase_owner_trg ON public.sessions;
CREATE TRIGGER sessions_phase_owner_trg
BEFORE INSERT OR UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_session_phase_owner();

-- Backfill phase_owner for existing rows
UPDATE public.sessions
SET phase_owner = public.default_phase_owner(sweetcycle_phase)
WHERE phase_owner IS NULL AND sweetcycle_phase IS NOT NULL;

-- relationship_portals table
CREATE TABLE IF NOT EXISTS public.relationship_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  kind public.portal_kind NOT NULL DEFAULT 'Other',
  version text,
  url text NOT NULL,
  delivered_at timestamptz,
  viewed_at timestamptz,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rel_portals_relationship ON public.relationship_portals(relationship_id);
CREATE INDEX IF NOT EXISTS idx_rel_portals_created ON public.relationship_portals(created_at DESC);

ALTER TABLE public.relationship_portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team read" ON public.relationship_portals;
CREATE POLICY "team read" ON public.relationship_portals FOR SELECT TO authenticated USING (is_team_member(auth.uid()));

DROP POLICY IF EXISTS "team insert" ON public.relationship_portals;
CREATE POLICY "team insert" ON public.relationship_portals FOR INSERT TO authenticated WITH CHECK (is_team_member(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "owner or admin update" ON public.relationship_portals;
CREATE POLICY "owner or admin update" ON public.relationship_portals FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "owner or admin delete" ON public.relationship_portals;
CREATE POLICY "owner or admin delete" ON public.relationship_portals FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS relationship_portals_set_updated_at ON public.relationship_portals;
CREATE TRIGGER relationship_portals_set_updated_at
BEFORE UPDATE ON public.relationship_portals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- engagement_service_rollup view
CREATE OR REPLACE VIEW public.engagement_service_rollup AS
SELECT
  es.id AS service_id,
  es.plan_id,
  es.relationship_id,
  es.service_type,
  es.status,
  COUNT(s.id)::int AS sessions_total,
  COUNT(s.id) FILTER (WHERE s.sweetcycle_phase = 'Ship')::int AS sessions_shipped,
  COUNT(s.id) FILTER (WHERE s.sweetcycle_phase IN ('Synthesize','Session','Sync'))::int AS sessions_in_flight,
  MIN(s.session_date) FILTER (WHERE s.session_date >= CURRENT_DATE) AS next_session_date,
  CASE WHEN COUNT(s.id) > 0
    THEN ROUND(100.0 * COUNT(s.id) FILTER (WHERE s.sweetcycle_phase = 'Ship') / COUNT(s.id))::int
    ELSE 0 END AS completion_pct
FROM public.engagement_services es
LEFT JOIN public.sessions s ON s.engagement_service_id = es.id
GROUP BY es.id;

-- relationship_journey view
CREATE OR REPLACE VIEW public.relationship_journey AS
WITH active_session AS (
  SELECT DISTINCT ON (s.relationship_id)
    s.relationship_id, s.id AS session_id, s.engagement_service_id,
    s.sweetcycle_phase, s.phase_owner, s.phase_due_date, s.phase_blocker, s.session_date
  FROM public.sessions s
  WHERE s.relationship_id IS NOT NULL
    AND COALESCE(s.sweetcycle_phase::text,'') NOT IN ('Ship')
  ORDER BY s.relationship_id, s.session_date NULLS LAST, s.created_at DESC
),
latest_portal AS (
  SELECT DISTINCT ON (relationship_id)
    relationship_id, id AS portal_id, url AS portal_url, kind AS portal_kind, delivered_at, viewed_at
  FROM public.relationship_portals
  ORDER BY relationship_id, created_at DESC
),
ship_counts AS (
  SELECT relationship_id,
    COUNT(*) FILTER (WHERE sweetcycle_phase = 'Ship')::int AS ship_count,
    COUNT(*)::int AS total_session_count
  FROM public.sessions
  WHERE relationship_id IS NOT NULL
  GROUP BY relationship_id
)
SELECT
  r.id AS relationship_id,
  r.name,
  r.pipeline_stage,
  r.awareness_tier,
  r.temperature,
  r.drift_risk,
  r.primary_service,
  r.service_status,
  COALESCE(
    CASE
      WHEN r.service_status = 'Active' AND r.primary_service IS NOT NULL THEN r.primary_service::text
      WHEN r.pipeline_stage IS NOT NULL THEN r.pipeline_stage
      WHEN r.awareness_tier IS NOT NULL THEN 'Awareness'
      ELSE 'Pre-Engagement'
    END,
    'Pre-Engagement'
  ) AS current_stage,
  a.session_id AS current_session_id,
  a.engagement_service_id AS current_service_id,
  a.sweetcycle_phase AS current_phase,
  a.phase_owner AS next_action_owner,
  a.phase_due_date AS next_action_due,
  a.phase_blocker AS current_blocker,
  COALESCE(sc.ship_count, 0) AS ship_count,
  COALESCE(sc.total_session_count, 0) AS total_session_count,
  lp.portal_url AS latest_portal_url,
  lp.portal_kind AS latest_portal_kind,
  lp.delivered_at AS latest_portal_delivered_at,
  lp.viewed_at AS latest_portal_viewed_at
FROM public.relationships r
LEFT JOIN active_session a ON a.relationship_id = r.id
LEFT JOIN latest_portal lp ON lp.relationship_id = r.id
LEFT JOIN ship_counts sc ON sc.relationship_id = r.id;

GRANT SELECT ON public.engagement_service_rollup TO authenticated;
GRANT SELECT ON public.relationship_journey TO authenticated;