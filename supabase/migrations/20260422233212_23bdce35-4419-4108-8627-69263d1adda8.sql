-- A. Task provenance
DO $$ BEGIN
  CREATE TYPE public.task_spawned_by_kind AS ENUM ('kti','spark','decision','capture','workflow','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS spawned_by_kind public.task_spawned_by_kind,
  ADD COLUMN IF NOT EXISTS spawned_by_id uuid;

CREATE INDEX IF NOT EXISTS idx_tasks_spawned_by ON public.tasks(spawned_by_kind, spawned_by_id);

-- B. Inbound signals (Capture → SweetScan inbox)
DO $$ BEGIN
  CREATE TYPE public.inbound_signal_source AS ENUM ('url','podcast','transcript','screenshot','text');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inbound_signal_status AS ENUM ('pending','routed','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.inbound_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind public.inbound_signal_source NOT NULL,
  source_url text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  capture_attachment_id uuid REFERENCES public.capture_attachments(id) ON DELETE SET NULL,
  classified_kind text,
  classified_subject_type text,
  classified_subject_id uuid,
  confidence numeric,
  summary text,
  status public.inbound_signal_status NOT NULL DEFAULT 'pending',
  routed_to_kind text,
  routed_to_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_signals_status ON public.inbound_signals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_signals_subject ON public.inbound_signals(classified_subject_type, classified_subject_id);

ALTER TABLE public.inbound_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view inbound signals"
  ON public.inbound_signals FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert inbound signals"
  ON public.inbound_signals FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Team members can update inbound signals"
  ON public.inbound_signals FOR UPDATE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can delete inbound signals"
  ON public.inbound_signals FOR DELETE
  USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_inbound_signals_updated_at
  BEFORE UPDATE ON public.inbound_signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- C. Bot alerts (KTI fire → bell)
CREATE TABLE IF NOT EXISTS public.bot_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  source_kind text,
  source_id uuid,
  relationship_id uuid REFERENCES public.relationships(id) ON DELETE SET NULL,
  for_user_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_alerts_unread ON public.bot_alerts(read_at, created_at DESC);

ALTER TABLE public.bot_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view bot alerts"
  ON public.bot_alerts FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert bot alerts"
  ON public.bot_alerts FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can update bot alerts"
  ON public.bot_alerts FOR UPDATE
  USING (public.is_team_member(auth.uid()));

-- D. Extend KTI fired trigger to dispatch on trigger_action
CREATE OR REPLACE FUNCTION public.trg_kti_scan_fired()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _kti record;
  _action text;
BEGIN
  IF NEW.fired = true THEN
    UPDATE public.key_trend_indicators
    SET status = 'fired', updated_at = now()
    WHERE id = NEW.kti_id AND status <> 'fired';

    SELECT id, name, relationship_id, owner_operator_id, trigger_action
      INTO _kti
    FROM public.key_trend_indicators
    WHERE id = NEW.kti_id;

    _action := lower(coalesce(_kti.trigger_action, ''));

    -- Spawn task
    IF _action IN ('task','all') THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.tasks
        WHERE spawned_by_kind = 'kti' AND spawned_by_id = NEW.id
      ) THEN
        INSERT INTO public.tasks (
          name, description, status, priority,
          relationship_id, due_date,
          spawned_by_kind, spawned_by_id,
          created_by
        ) VALUES (
          'KTI fired: ' || _kti.name,
          coalesce(NEW.notes, 'Fired KTI requires review.'),
          'To Do', 'High',
          _kti.relationship_id,
          (CURRENT_DATE + interval '3 days')::date,
          'kti', NEW.id,
          coalesce(NEW.created_by, _kti.owner_operator_id)
        );
      END IF;
    END IF;

    -- Bot alert
    IF _action IN ('bot_alert','all') THEN
      INSERT INTO public.bot_alerts (kind, title, body, source_kind, source_id, relationship_id)
      VALUES (
        'kti_fire',
        'KTI fired: ' || _kti.name,
        coalesce(NEW.observed_value, NEW.notes),
        'kti_scan', NEW.id, _kti.relationship_id
      );
    END IF;

    -- Flightdeck flag handled at read time via fired status; no extra write needed.
  END IF;
  RETURN NEW;
END;
$function$;