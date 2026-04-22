-- Enum for what kind of subject a lens perspective applies to
CREATE TYPE public.lens_subject_kind AS ENUM (
  'domain',
  'tenet',
  'component',
  'relationship',
  'mission',
  'project'
);

-- Canonical Lens / BizzyBot catalog
CREATE TABLE public.lenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL,
  what_it_asks text,
  best_use text,
  stages text[] NOT NULL DEFAULT ARRAY[]::text[],
  bizzybot_emoji text,
  icon_key text,
  accent_color text NOT NULL DEFAULT '#8B5CF6',
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER lenses_set_updated_at
  BEFORE UPDATE ON public.lenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can read lenses"
  ON public.lenses FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Admins manage lenses"
  ON public.lenses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- AI-generated cached lens perspectives per (lens × subject)
CREATE TABLE public.lens_perspectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_id uuid NOT NULL REFERENCES public.lenses(id) ON DELETE CASCADE,
  subject_kind public.lens_subject_kind NOT NULL,
  subject_id uuid NOT NULL,
  quick_facts text[] NOT NULL DEFAULT ARRAY[]::text[],
  perspective_md text,
  key_questions text[] NOT NULL DEFAULT ARRAY[]::text[],
  watch_outs text[] NOT NULL DEFAULT ARRAY[]::text[],
  next_actions text[] NOT NULL DEFAULT ARRAY[]::text[],
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by_model text,
  confidence numeric,
  version int NOT NULL DEFAULT 1,
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lens_id, subject_kind, subject_id, version)
);

CREATE INDEX idx_lens_perspectives_subject
  ON public.lens_perspectives (subject_kind, subject_id);
CREATE INDEX idx_lens_perspectives_latest
  ON public.lens_perspectives (lens_id, subject_kind, subject_id, version DESC);

CREATE TRIGGER lens_perspectives_set_updated_at
  BEFORE UPDATE ON public.lens_perspectives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lens_perspectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can read lens perspectives"
  ON public.lens_perspectives FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team can insert lens perspectives"
  ON public.lens_perspectives FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team can update lens perspectives"
  ON public.lens_perspectives FOR UPDATE
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Admins delete lens perspectives"
  ON public.lens_perspectives FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Cross-lens crib sheet summary per entity
CREATE TABLE public.entity_crib_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind public.lens_subject_kind NOT NULL,
  subject_id uuid NOT NULL,
  tldr text,
  core_principles text[] NOT NULL DEFAULT ARRAY[]::text[],
  quick_facts text[] NOT NULL DEFAULT ARRAY[]::text[],
  common_pitfalls text[] NOT NULL DEFAULT ARRAY[]::text[],
  signature_metrics text[] NOT NULL DEFAULT ARRAY[]::text[],
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by_model text,
  version int NOT NULL DEFAULT 1,
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_kind, subject_id, version)
);

CREATE INDEX idx_entity_crib_sheets_subject
  ON public.entity_crib_sheets (subject_kind, subject_id, version DESC);

CREATE TRIGGER entity_crib_sheets_set_updated_at
  BEFORE UPDATE ON public.entity_crib_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.entity_crib_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can read crib sheets"
  ON public.entity_crib_sheets FOR SELECT
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team can insert crib sheets"
  ON public.entity_crib_sheets FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Team can update crib sheets"
  ON public.entity_crib_sheets FOR UPDATE
  USING (public.is_team_member(auth.uid()))
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE POLICY "Admins delete crib sheets"
  ON public.entity_crib_sheets FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed the 8 canonical BizzyBot Lenses
INSERT INTO public.lenses (code, name, tagline, what_it_asks, best_use, stages, bizzybot_emoji, icon_key, accent_color, sort_order) VALUES
  ('F1', 'OCDA',         'Observe → Choose → Decide → Act',
    'What do we know? What paths exist? What are we choosing? What happens next?',
    'Decision structure, variation selection, next-best-work prioritization',
    ARRAY['Observe','Choose','Decide','Act'],
    '🧭', 'compass', '#7C3AED', 1),
  ('F2', 'Gestalt',       'Past → Present → Future',
    'What was true, what is true, what are we moving toward?',
    'Client reflection, evolution tracking, before/after arc',
    ARRAY['Past','Present','Future'],
    '🌗', 'hourglass', '#0EA5E9', 2),
  ('F3', '4Ds',           'Discover → Define → Develop → Deliver',
    'What stage are we in: Discover, Define, Develop, Deliver?',
    'Separating design work from build work and checking lifecycle stage',
    ARRAY['Discover','Define','Develop','Deliver'],
    '🧪', 'flask', '#10B981', 3),
  ('F4', '5Ps',           'Purpose → People → Process → Product → Profit',
    'Have we covered Purpose, People, Process, Product, Profit?',
    'Completeness check before something is considered coherent',
    ARRAY['Purpose','People','Process','Product','Profit'],
    '🪷', 'lotus', '#F59E0B', 4),
  ('F5', '3Cs',           'Consent → Control → Collaboration',
    'Who consented, who controls, who collaborates?',
    'Governance, enterprise work, shared systems, IP boundaries',
    ARRAY['Consent','Control','Collaboration'],
    '🤝', 'handshake', '#EF4444', 5),
  ('F6', '5Ls',           'Lacking → Learning → Launching → Leveraging → Leading',
    'How mature is this really?',
    'Readiness, reuse confidence, Domain and Component maturity',
    ARRAY['Lacking','Learning','Launching','Leveraging','Leading'],
    '📈', 'trending-up', '#EC4899', 6),
  ('F7', 'Co-Evolution',  'Explore / Exploit → Attune → Integrate → Recalibrate',
    'Explore or Exploit first → Attune → Integrate → Recalibrate',
    'Learning flywheel, adaptation, reuse vs novelty',
    ARRAY['Explore / Exploit','Attune','Integrate','Recalibrate'],
    '🌀', 'spiral', '#06B6D4', 7),
  ('F8', 'Rhetorical',    'Ethos → Pathos → Kairos → Logos',
    'How should this be explained so it lands?',
    'Client-facing language, Portal narrative, recommendation framing',
    ARRAY['Ethos','Pathos','Kairos','Logos'],
    '🎭', 'theater', '#A855F7', 8);