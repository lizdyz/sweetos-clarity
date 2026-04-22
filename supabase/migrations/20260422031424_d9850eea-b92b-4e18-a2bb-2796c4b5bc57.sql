-- Cadence settings: tunable numeric variables for the transformation system
CREATE TABLE public.cadence_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  value_number NUMERIC NOT NULL,
  min_value NUMERIC,
  max_value NUMERIC,
  step_value NUMERIC,
  category TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cadence_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view cadence"
  ON public.cadence_settings FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "admins update cadence"
  ON public.cadence_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- No client INSERT or DELETE — keys are managed via migrations.

CREATE TRIGGER cadence_settings_set_updated_at
  BEFORE UPDATE ON public.cadence_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Seed canonical cadence variables
INSERT INTO public.cadence_settings (key, label, description, value_number, min_value, max_value, step_value, category, sort_order) VALUES
  ('sparks_per_journey_target', 'Sparks per Journey (target)', 'Target number of sparks expected to complete a typical journey.', 8, 1, 50, 1, 'sparks', 10),
  ('spark_completion_window_days', 'Spark completion window (days)', 'Days a client has to engage with a spark before it ages out.', 7, 1, 60, 1, 'sparks', 20),
  ('sparks_per_week_target', 'Sparks per week (per client)', 'Target spark cadence delivered to an active client per week.', 2, 0, 14, 1, 'sparks', 30),

  ('quests_per_mission_target', 'Quests per Mission (target)', 'Target number of quests that complete a typical mission.', 4, 1, 20, 1, 'quests', 10),
  ('quest_duration_weeks_default', 'Default quest duration (weeks)', 'Default planned length of a quest, in weeks.', 3, 1, 26, 1, 'quests', 20),
  ('active_quests_per_client_max', 'Max active quests per client', 'Soft cap on simultaneously active quests for one client.', 2, 1, 10, 1, 'quests', 30),

  ('journeys_per_mission_target', 'Journeys per Mission (target)', 'Target number of activated journeys inside a mission.', 3, 1, 12, 1, 'journeys', 10),
  ('active_journeys_per_client_max', 'Max active journeys per client', 'Soft cap on simultaneously active journeys for one client.', 2, 1, 8, 1, 'journeys', 20),

  ('mission_duration_weeks_default', 'Default mission duration (weeks)', 'Default planned length of a mission, in weeks.', 12, 2, 104, 1, 'missions', 10),
  ('active_missions_per_client_max', 'Max active missions per client', 'Soft cap on simultaneously active missions for one client.', 1, 1, 5, 1, 'missions', 20),

  ('sessions_per_week_target', 'Sessions per week (operator total)', 'Target sessions Liz delivers across all clients per week.', 6, 0, 40, 1, 'sessions', 10),
  ('session_followup_window_days', 'Session follow-through window (days)', 'Days after a session within which Sync + Ship should complete.', 5, 1, 30, 1, 'sessions', 20),
  ('seed_lead_time_days', 'Seed lead time before session (days)', 'Days before a session that the seed should be submitted.', 2, 0, 14, 1, 'sessions', 30),

  ('mirror_refresh_days', 'Mirror refresh interval (days)', 'How often a client''s Mirror diagnostic should be refreshed.', 90, 14, 365, 1, 'mirror', 10),
  ('mirror_confidence_decay_days', 'Mirror confidence decay (days)', 'After this many days, mirror evidence drops one confidence tier.', 60, 14, 365, 1, 'mirror', 20);