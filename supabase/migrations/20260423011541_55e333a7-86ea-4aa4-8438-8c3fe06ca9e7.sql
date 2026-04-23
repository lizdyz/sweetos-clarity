-- Wave 6: Canon reconciliation — close the 8 gaps

-- =====================================================================
-- Issue 8: module_tags on playbooks + workflows
-- =====================================================================
ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS module_tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS module_tags text[] NOT NULL DEFAULT '{}'::text[];

-- =====================================================================
-- Issue 2 + 6: deliverable_source enum + catalog_entry_id on documents
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.deliverable_source AS ENUM ('quest','session','manual','workflow');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS deliverable_source public.deliverable_source DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS catalog_entry_id uuid REFERENCES public.entity_canon(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_catalog_entry ON public.documents(catalog_entry_id) WHERE catalog_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deliverable_source ON public.documents(deliverable_source);

-- =====================================================================
-- Issue 1: capabilities derived view (Components ≥ L3 grouped by Journey)
-- =====================================================================
CREATE OR REPLACE VIEW public.capabilities_derived AS
SELECT
  j.id                                AS journey_id,
  j.name                              AS journey_name,
  count(c.id)                         AS component_count,
  count(c.id) FILTER (
    WHERE c.current_maturity_level IN ('L3 Launching','L4 Leveraging','L5 Leading')
  )                                   AS l3_plus_count,
  array_agg(c.id ORDER BY c.name) FILTER (
    WHERE c.current_maturity_level IN ('L3 Launching','L4 Leveraging','L5 Leading')
  )                                   AS l3_plus_component_ids,
  array_agg(c.name ORDER BY c.name) FILTER (
    WHERE c.current_maturity_level IN ('L3 Launching','L4 Leveraging','L5 Leading')
  )                                   AS l3_plus_component_names,
  CASE
    WHEN count(c.id) = 0 THEN 'none'
    WHEN count(c.id) FILTER (WHERE c.current_maturity_level IN ('L3 Launching','L4 Leveraging','L5 Leading')) = 0 THEN 'emerging'
    WHEN count(c.id) FILTER (WHERE c.current_maturity_level IN ('L3 Launching','L4 Leveraging','L5 Leading'))::numeric / count(c.id) >= 0.6 THEN 'capable'
    ELSE 'partial'
  END                                 AS capability_state
FROM public.journeys j
LEFT JOIN public.components c ON c.journey_id = j.id
GROUP BY j.id, j.name;

-- =====================================================================
-- Issue 4: domain_assessment_versions (living model)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.domain_assessment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.domain_assessments(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.relationships(id) ON DELETE CASCADE,
  domain text NOT NULL,
  version_no integer NOT NULL,
  client_score numeric,
  liz_score numeric,
  confidence public.intelligence_confidence,
  gap numeric,
  gap_direction text,
  notes text,
  source_kind text NOT NULL DEFAULT 'mirror',
  source_id uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid DEFAULT auth.uid(),
  UNIQUE (assessment_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_dav_assessment ON public.domain_assessment_versions(assessment_id, version_no DESC);
CREATE INDEX IF NOT EXISTS idx_dav_client ON public.domain_assessment_versions(client_id);

ALTER TABLE public.domain_assessment_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read versions" ON public.domain_assessment_versions
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write versions" ON public.domain_assessment_versions
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- =====================================================================
-- Issue 7: reflection_events (lifecycle reflections, separate from sparks.kind='reflection')
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.reflection_event_kind AS ENUM (
    'quest_completion','component_levelup','journey_milestone','mission_milestone','periodic','custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.reflection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.reflection_event_kind NOT NULL,
  source_kind text,
  source_id uuid,
  relationship_id uuid REFERENCES public.relationships(id) ON DELETE CASCADE,
  title text NOT NULL,
  prompt text,
  response text,
  responded_at timestamptz,
  responded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_reflection_events_kind ON public.reflection_events(kind);
CREATE INDEX IF NOT EXISTS idx_reflection_events_source ON public.reflection_events(source_kind, source_id);
CREATE INDEX IF NOT EXISTS idx_reflection_events_relationship ON public.reflection_events(relationship_id);
CREATE INDEX IF NOT EXISTS idx_reflection_events_open ON public.reflection_events(responded_at) WHERE responded_at IS NULL;

ALTER TABLE public.reflection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read reflections" ON public.reflection_events
  FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team write reflections" ON public.reflection_events
  FOR ALL TO authenticated
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

-- =====================================================================
-- Issue 7 wiring: extend quest/journey/mission completion triggers to spawn reflections
-- =====================================================================
CREATE OR REPLACE FUNCTION public.trg_quest_complete_reflection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.progression_state::text IN ('Confirmed Complete','Completed by you','Completed with Liz','Completed for you')
     AND (OLD.progression_state IS DISTINCT FROM NEW.progression_state) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.reflection_events
      WHERE source_kind = 'quest' AND source_id = NEW.id AND kind = 'quest_completion'
    ) THEN
      INSERT INTO public.reflection_events (kind, source_kind, source_id, relationship_id, title, prompt)
      VALUES (
        'quest_completion','quest', NEW.id, NEW.relationship_id,
        'Reflect on quest: ' || COALESCE(NEW.name, 'untitled'),
        'What changed? What surprised you? What is the next bet?'
      );
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS quest_complete_reflection ON public.quests;
CREATE TRIGGER quest_complete_reflection
  AFTER UPDATE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.trg_quest_complete_reflection();

CREATE OR REPLACE FUNCTION public.trg_journey_complete_reflection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(coalesce(NEW.status,'')) IN ('complete','completed','done')
     AND coalesce(OLD.status,'') IS DISTINCT FROM coalesce(NEW.status,'') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.reflection_events
      WHERE source_kind = 'journey' AND source_id = NEW.id AND kind = 'journey_milestone'
    ) THEN
      INSERT INTO public.reflection_events (kind, source_kind, source_id, title, prompt)
      VALUES (
        'journey_milestone','journey', NEW.id,
        'Journey milestone: ' || COALESCE(NEW.name, 'untitled'),
        'What capabilities did this journey actually develop? Where are we now on the maturity scale?'
      );
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS journey_complete_reflection ON public.journeys;
CREATE TRIGGER journey_complete_reflection
  AFTER UPDATE ON public.journeys
  FOR EACH ROW EXECUTE FUNCTION public.trg_journey_complete_reflection();

CREATE OR REPLACE FUNCTION public.trg_mission_complete_reflection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(coalesce(NEW.status,'')) IN ('complete','completed','done')
     AND coalesce(OLD.status,'') IS DISTINCT FROM coalesce(NEW.status,'') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.reflection_events
      WHERE source_kind = 'mission' AND source_id = NEW.id AND kind = 'mission_milestone'
    ) THEN
      INSERT INTO public.reflection_events (kind, source_kind, source_id, title, prompt)
      VALUES (
        'mission_milestone','mission', NEW.id,
        'Mission milestone: ' || COALESCE(NEW.name, 'untitled'),
        'Did the transformation hold? What is the next mission?'
      );
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS mission_complete_reflection ON public.missions;
CREATE TRIGGER mission_complete_reflection
  AFTER UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.trg_mission_complete_reflection();

-- =====================================================================
-- Issue 3: Map/Machine session evidence advances Components
-- When session_components row added with Primary, bump component last_reviewed
-- and emit a component_levelup reflection if maturity moved up.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.trg_session_component_advance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _old_level public.maturity_level;
  _new_level public.maturity_level;
BEGIN
  IF lower(COALESCE(NEW.advancement_type,'')) IN ('primary','secondary') THEN
    UPDATE public.components
       SET last_reviewed = CURRENT_DATE,
           updated_at    = now()
     WHERE id = NEW.component_id
    RETURNING current_maturity_level INTO _old_level;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS session_component_advance ON public.session_components;
CREATE TRIGGER session_component_advance
  AFTER INSERT ON public.session_components
  FOR EACH ROW EXECUTE FUNCTION public.trg_session_component_advance();
