-- Enums
CREATE TYPE public.kti_trigger_action AS ENUM ('task','bot_alert','flightdeck_flag','all');
CREATE TYPE public.kti_scan_frequency AS ENUM ('daily','weekly','monthly');
CREATE TYPE public.kti_status AS ENUM ('active','paused','fired');
CREATE TYPE public.kti_direction AS ENUM ('up','down','flat','fired','unknown');

-- Main table
CREATE TABLE public.key_trend_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  domain_id uuid REFERENCES public.domains(id) ON DELETE SET NULL,
  owner_operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  threshold_definition text NOT NULL,
  trigger_action public.kti_trigger_action NOT NULL DEFAULT 'bot_alert',
  scan_frequency public.kti_scan_frequency NOT NULL DEFAULT 'weekly',
  status public.kti_status NOT NULL DEFAULT 'active',
  relationship_id uuid REFERENCES public.relationships(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

CREATE INDEX idx_ktis_domain ON public.key_trend_indicators(domain_id);
CREATE INDEX idx_ktis_relationship ON public.key_trend_indicators(relationship_id);
CREATE INDEX idx_ktis_status ON public.key_trend_indicators(status);

-- Scans table
CREATE TABLE public.kti_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kti_id uuid NOT NULL REFERENCES public.key_trend_indicators(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  observed_value text,
  direction public.kti_direction NOT NULL DEFAULT 'unknown',
  fired boolean NOT NULL DEFAULT false,
  evidence jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

CREATE INDEX idx_kti_scans_kti_time ON public.kti_scans(kti_id, scanned_at DESC);

-- updated_at trigger
CREATE TRIGGER trg_ktis_updated_at
BEFORE UPDATE ON public.key_trend_indicators
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- When a scan fires, flip parent KTI status to 'fired'
CREATE OR REPLACE FUNCTION public.trg_kti_scan_fired()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fired = true THEN
    UPDATE public.key_trend_indicators
    SET status = 'fired', updated_at = now()
    WHERE id = NEW.kti_id AND status <> 'fired';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kti_scans_fired
AFTER INSERT ON public.kti_scans
FOR EACH ROW EXECUTE FUNCTION public.trg_kti_scan_fired();

-- RLS
ALTER TABLE public.key_trend_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kti_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view ktis" ON public.key_trend_indicators
FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can insert ktis" ON public.key_trend_indicators
FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team can update ktis" ON public.key_trend_indicators
FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can delete ktis" ON public.key_trend_indicators
FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE POLICY "team can view kti scans" ON public.kti_scans
FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can insert kti scans" ON public.kti_scans
FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "team can update kti scans" ON public.kti_scans
FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "team can delete kti scans" ON public.kti_scans
FOR DELETE USING (public.is_team_member(auth.uid()));