-- Thinking Room: free-form planning workspace
-- Two additive tables. No changes to existing tables.

CREATE TABLE public.thinking_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_thinking_topics_journey ON public.thinking_topics(journey_id);
CREATE INDEX idx_thinking_topics_pinned ON public.thinking_topics(pinned) WHERE pinned = true;

CREATE TABLE public.thinking_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES public.thinking_topics(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('canvas','note','question','candidate','linked','prompt')),
  body text,
  candidate_kind text CHECK (candidate_kind IN ('quest','project','decision','component','jtbd','kpi','task')),
  promoted_to_kind text,
  promoted_to_id uuid,
  linked_kind text,
  linked_id uuid,
  position integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_thinking_items_topic ON public.thinking_items(topic_id, kind, position);
CREATE INDEX idx_thinking_items_promoted ON public.thinking_items(promoted_to_kind, promoted_to_id) WHERE promoted_to_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.thinking_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thinking_items ENABLE ROW LEVEL SECURITY;

-- Policies: team members can do everything (matches workspace pattern)
CREATE POLICY "Team members can view thinking topics"
  ON public.thinking_topics FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert thinking topics"
  ON public.thinking_topics FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can update thinking topics"
  ON public.thinking_topics FOR UPDATE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can delete thinking topics"
  ON public.thinking_topics FOR DELETE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can view thinking items"
  ON public.thinking_items FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert thinking items"
  ON public.thinking_items FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can update thinking items"
  ON public.thinking_items FOR UPDATE
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can delete thinking items"
  ON public.thinking_items FOR DELETE
  USING (public.is_team_member(auth.uid()));

-- Timestamp triggers
CREATE TRIGGER update_thinking_topics_updated_at
  BEFORE UPDATE ON public.thinking_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_thinking_items_updated_at
  BEFORE UPDATE ON public.thinking_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();