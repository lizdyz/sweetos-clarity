ALTER TABLE public.sandbox_items
  ADD COLUMN IF NOT EXISTS attached_documents uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS upstream_entity jsonb;

CREATE INDEX IF NOT EXISTS idx_sandbox_items_attached_documents
  ON public.sandbox_items USING GIN (attached_documents);

CREATE INDEX IF NOT EXISTS idx_sandbox_items_upstream_entity
  ON public.sandbox_items USING GIN (upstream_entity);