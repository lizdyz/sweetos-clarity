DO $$ BEGIN
  CREATE TYPE public.sandbox_source_kind AS ENUM ('capture','kti_fire','inbound_signal','spark','session_question','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sandbox_state AS ENUM ('raw','framed','routed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sandbox_route_kind AS ENUM ('task','project','spark','decision_input','component_canon','archive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sandbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind public.sandbox_source_kind NOT NULL DEFAULT 'manual',
  source_id uuid,
  title text NOT NULL,
  body text,
  state public.sandbox_state NOT NULL DEFAULT 'raw',
  frames jsonb NOT NULL DEFAULT '[]'::jsonb,
  tagged_domains text[] NOT NULL DEFAULT '{}',
  tagged_tenets text[] NOT NULL DEFAULT '{}',
  tagged_components text[] NOT NULL DEFAULT '{}',
  relationship_id uuid,
  confidence numeric,
  routed_to_kind public.sandbox_route_kind,
  routed_to_id uuid,
  routed_at timestamptz,
  routed_note text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_items_state ON public.sandbox_items(state);
CREATE INDEX IF NOT EXISTS idx_sandbox_items_source ON public.sandbox_items(source_kind, source_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_items_created_at ON public.sandbox_items(created_at DESC);

DROP TRIGGER IF EXISTS sandbox_items_set_updated_at ON public.sandbox_items;
CREATE TRIGGER sandbox_items_set_updated_at
BEFORE UPDATE ON public.sandbox_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sandbox_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team can view sandbox items" ON public.sandbox_items;
CREATE POLICY "Team can view sandbox items" ON public.sandbox_items
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Team can insert sandbox items" ON public.sandbox_items;
CREATE POLICY "Team can insert sandbox items" ON public.sandbox_items
  FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Team can update sandbox items" ON public.sandbox_items;
CREATE POLICY "Team can update sandbox items" ON public.sandbox_items
  FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Team can delete sandbox items" ON public.sandbox_items;
CREATE POLICY "Team can delete sandbox items" ON public.sandbox_items
  FOR DELETE TO authenticated USING (public.is_team_member(auth.uid()));

CREATE OR REPLACE VIEW public.sandbox_inbox AS
WITH manual_items AS (
  SELECT
    s.id,
    s.source_kind::text AS source_kind,
    s.source_id,
    s.title,
    s.body,
    s.state::text AS state,
    s.frames,
    s.relationship_id,
    s.created_at
  FROM public.sandbox_items s
),
captures_feed AS (
  SELECT
    p.id,
    'capture'::text AS source_kind,
    p.id AS source_id,
    COALESCE(NULLIF(p.source_label, ''), 'Capture: ' || p.entity_type::text) AS title,
    COALESCE(p.ai_notes, p.raw_input) AS body,
    'raw'::text AS state,
    '[]'::jsonb AS frames,
    NULL::uuid AS relationship_id,
    p.created_at
  FROM public.proposals p
  WHERE p.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.sandbox_items si
      WHERE si.source_kind = 'capture' AND si.source_id = p.id
    )
),
kti_fires_feed AS (
  SELECT
    ks.id,
    'kti_fire'::text AS source_kind,
    ks.id AS source_id,
    'KTI fired: ' || COALESCE(k.name, 'Untitled') AS title,
    COALESCE(ks.notes, ks.observed_value) AS body,
    'raw'::text AS state,
    '[]'::jsonb AS frames,
    k.relationship_id,
    ks.scanned_at AS created_at
  FROM public.kti_scans ks
  JOIN public.key_trend_indicators k ON k.id = ks.kti_id
  WHERE ks.fired = true
    AND ks.scanned_at > now() - interval '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.sandbox_items si
      WHERE si.source_kind = 'kti_fire' AND si.source_id = ks.id
    )
),
inbound_feed AS (
  SELECT
    isig.id,
    'inbound_signal'::text AS source_kind,
    isig.id AS source_id,
    COALESCE(NULLIF(isig.summary, ''), 'Inbound: ' || isig.source_kind::text) AS title,
    isig.summary AS body,
    'raw'::text AS state,
    '[]'::jsonb AS frames,
    NULL::uuid AS relationship_id,
    isig.created_at
  FROM public.inbound_signals isig
  WHERE isig.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.sandbox_items si
      WHERE si.source_kind = 'inbound_signal' AND si.source_id = isig.id
    )
)
SELECT * FROM manual_items
UNION ALL SELECT * FROM captures_feed
UNION ALL SELECT * FROM kti_fires_feed
UNION ALL SELECT * FROM inbound_feed;