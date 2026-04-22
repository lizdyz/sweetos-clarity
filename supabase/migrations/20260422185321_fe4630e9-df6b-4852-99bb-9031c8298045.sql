
-- ============================================================
-- entity_canon — "what perfection looks like" per entity kind
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entity_canon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind text NOT NULL UNIQUE,
  display_name text NOT NULL,
  one_liner text,
  what_it_is text,
  what_good_looks_like text[] NOT NULL DEFAULT ARRAY[]::text[],
  what_bad_looks_like text[] NOT NULL DEFAULT ARRAY[]::text[],
  inputs text[] NOT NULL DEFAULT ARRAY[]::text[],
  outputs text[] NOT NULL DEFAULT ARRAY[]::text[],
  reinforcement_loop text,
  example_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  alternate_viewpoints jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_canon_status_check CHECK (status IN ('draft','defined','needs_review'))
);

ALTER TABLE public.entity_canon ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read canon"
  ON public.entity_canon FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "admin insert canon"
  ON public.entity_canon FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin update canon"
  ON public.entity_canon FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin delete canon"
  ON public.entity_canon FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_entity_canon_updated_at
  BEFORE UPDATE ON public.entity_canon
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- entity_canon_revisions — audit trail of every canon edit
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entity_canon_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canon_id uuid REFERENCES public.entity_canon(id) ON DELETE CASCADE,
  entity_kind text NOT NULL,
  snapshot jsonb NOT NULL,
  rationale text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entity_canon_revisions_kind_idx
  ON public.entity_canon_revisions (entity_kind, changed_at DESC);

ALTER TABLE public.entity_canon_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team read revisions"
  ON public.entity_canon_revisions FOR SELECT
  TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "admin insert revisions"
  ON public.entity_canon_revisions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Auto-snapshot canon edits into the revisions table
CREATE OR REPLACE FUNCTION public.trg_entity_canon_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.entity_canon_revisions (canon_id, entity_kind, snapshot, changed_by)
    VALUES (
      OLD.id,
      OLD.entity_kind,
      to_jsonb(OLD),
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entity_canon_snapshot
  AFTER UPDATE ON public.entity_canon
  FOR EACH ROW EXECUTE FUNCTION public.trg_entity_canon_revision();
