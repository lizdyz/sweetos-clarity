ALTER TABLE public.inbound_signals
  ADD COLUMN IF NOT EXISTS suggested_kti_payload jsonb;

CREATE INDEX IF NOT EXISTS idx_inbound_signals_suggested_kti
  ON public.inbound_signals ((suggested_kti_payload IS NOT NULL))
  WHERE suggested_kti_payload IS NOT NULL;