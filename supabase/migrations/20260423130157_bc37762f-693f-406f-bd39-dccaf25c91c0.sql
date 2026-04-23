-- ============================================
-- Wave 17: Smart Ingestion
-- ============================================

-- Enums
CREATE TYPE public.ingestion_run_status AS ENUM (
  'draft','uploading','analyzing','review','importing','complete','failed','cancelled'
);

CREATE TYPE public.ingestion_classification_status AS ENUM (
  'proposed','approved','excluded','needs_review'
);

CREATE TYPE public.ingestion_suggestion_status AS ENUM (
  'proposed','approved','skipped','renamed'
);

CREATE TYPE public.ingestion_result_status AS ENUM (
  'created','updated','skipped','failed'
);

-- ============================================
-- ingestion_runs
-- ============================================
CREATE TABLE public.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  status public.ingestion_run_status NOT NULL DEFAULT 'draft',
  notes text,
  file_count int NOT NULL DEFAULT 0,
  group_count int NOT NULL DEFAULT 0,
  schema_suggestion_count int NOT NULL DEFAULT 0,
  object_suggestion_count int NOT NULL DEFAULT 0,
  created_count int NOT NULL DEFAULT 0,
  updated_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view own ingestion runs"
  ON public.ingestion_runs FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "team can insert own ingestion runs"
  ON public.ingestion_runs FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "team can update own ingestion runs"
  ON public.ingestion_runs FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "team can delete own ingestion runs"
  ON public.ingestion_runs FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE TRIGGER set_ingestion_runs_updated_at
  BEFORE UPDATE ON public.ingestion_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ingestion_runs_created_by ON public.ingestion_runs(created_by, created_at DESC);

-- ============================================
-- ingestion_files
-- ============================================
CREATE TABLE public.ingestion_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  group_id uuid,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  extension text,
  parsed_text text,
  structure_json jsonb DEFAULT '{}'::jsonb,
  parse_error text,
  duplicate_of uuid REFERENCES public.ingestion_files(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view own ingestion files"
  ON public.ingestion_files FOR SELECT TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can insert own ingestion files"
  ON public.ingestion_files FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_member(auth.uid()) AND created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can update own ingestion files"
  ON public.ingestion_files FOR UPDATE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can delete own ingestion files"
  ON public.ingestion_files FOR DELETE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE TRIGGER set_ingestion_files_updated_at
  BEFORE UPDATE ON public.ingestion_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ingestion_files_run ON public.ingestion_files(run_id);
CREATE INDEX idx_ingestion_files_group ON public.ingestion_files(group_id);
CREATE INDEX idx_ingestion_files_sha ON public.ingestion_files(sha256);

-- ============================================
-- ingestion_file_groups
-- ============================================
CREATE TABLE public.ingestion_file_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  signature text NOT NULL,
  pattern_label text,
  heading_pattern text[],
  column_signature text[],
  sample_count int NOT NULL DEFAULT 0,
  proposed_object_type text,
  proposed_target_table text,
  confidence numeric(4,3) DEFAULT 0,
  rationale text,
  status public.ingestion_classification_status NOT NULL DEFAULT 'proposed',
  matched_rule_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_file_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view own ingestion groups"
  ON public.ingestion_file_groups FOR SELECT TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can insert own ingestion groups"
  ON public.ingestion_file_groups FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can update own ingestion groups"
  ON public.ingestion_file_groups FOR UPDATE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can delete own ingestion groups"
  ON public.ingestion_file_groups FOR DELETE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE TRIGGER set_ingestion_file_groups_updated_at
  BEFORE UPDATE ON public.ingestion_file_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ingestion_file_groups_run ON public.ingestion_file_groups(run_id);

ALTER TABLE public.ingestion_files
  ADD CONSTRAINT ingestion_files_group_fk
  FOREIGN KEY (group_id) REFERENCES public.ingestion_file_groups(id) ON DELETE SET NULL;

-- ============================================
-- ingestion_classifications (per-file overrides)
-- ============================================
CREATE TABLE public.ingestion_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.ingestion_files(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.ingestion_file_groups(id) ON DELETE SET NULL,
  target_object_type text,
  target_table text,
  field_map jsonb DEFAULT '{}'::jsonb,
  matched_field_count int DEFAULT 0,
  unmatched_field_count int DEFAULT 0,
  confidence numeric(4,3) DEFAULT 0,
  rationale text,
  status public.ingestion_classification_status NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view own ingestion classifications"
  ON public.ingestion_classifications FOR SELECT TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can insert own ingestion classifications"
  ON public.ingestion_classifications FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can update own ingestion classifications"
  ON public.ingestion_classifications FOR UPDATE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can delete own ingestion classifications"
  ON public.ingestion_classifications FOR DELETE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE TRIGGER set_ingestion_classifications_updated_at
  BEFORE UPDATE ON public.ingestion_classifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ingestion_classifications_run ON public.ingestion_classifications(run_id);
CREATE INDEX idx_ingestion_classifications_file ON public.ingestion_classifications(file_id);

-- ============================================
-- ingestion_schema_suggestions
-- ============================================
CREATE TABLE public.ingestion_schema_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.ingestion_file_groups(id) ON DELETE SET NULL,
  source_column text NOT NULL,
  sample_values text[] DEFAULT ARRAY[]::text[],
  guessed_type text,
  suggested_destination_table text,
  suggested_field_name text,
  occurrence_count int DEFAULT 1,
  rationale text,
  status public.ingestion_suggestion_status NOT NULL DEFAULT 'proposed',
  approved_field_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_schema_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view own schema suggestions"
  ON public.ingestion_schema_suggestions FOR SELECT TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can insert own schema suggestions"
  ON public.ingestion_schema_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can update own schema suggestions"
  ON public.ingestion_schema_suggestions FOR UPDATE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can delete own schema suggestions"
  ON public.ingestion_schema_suggestions FOR DELETE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE TRIGGER set_ingestion_schema_suggestions_updated_at
  BEFORE UPDATE ON public.ingestion_schema_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ingestion_schema_suggestions_run ON public.ingestion_schema_suggestions(run_id);

-- ============================================
-- ingestion_object_suggestions
-- ============================================
CREATE TABLE public.ingestion_object_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.ingestion_file_groups(id) ON DELETE SET NULL,
  proposed_name text NOT NULL,
  evidence_file_ids uuid[] DEFAULT ARRAY[]::uuid[],
  suggested_fields jsonb DEFAULT '[]'::jsonb,
  rationale text,
  status public.ingestion_suggestion_status NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_object_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view own object suggestions"
  ON public.ingestion_object_suggestions FOR SELECT TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can insert own object suggestions"
  ON public.ingestion_object_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can update own object suggestions"
  ON public.ingestion_object_suggestions FOR UPDATE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can delete own object suggestions"
  ON public.ingestion_object_suggestions FOR DELETE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE TRIGGER set_ingestion_object_suggestions_updated_at
  BEFORE UPDATE ON public.ingestion_object_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ingestion_object_suggestions_run ON public.ingestion_object_suggestions(run_id);

-- ============================================
-- ingestion_mapping_rules (learned aliases — per-user)
-- ============================================
CREATE TABLE public.ingestion_mapping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_kind text NOT NULL, -- 'column_name' | 'heading' | 'filename' | 'signature'
  pattern text NOT NULL,
  target_object_type text,
  target_table text,
  target_field text,
  scope text NOT NULL DEFAULT 'global', -- 'global' | 'per_run'
  run_id uuid REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  hit_count int NOT NULL DEFAULT 1,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_mapping_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view own mapping rules"
  ON public.ingestion_mapping_rules FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "team can insert own mapping rules"
  ON public.ingestion_mapping_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "team can update own mapping rules"
  ON public.ingestion_mapping_rules FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "team can delete own mapping rules"
  ON public.ingestion_mapping_rules FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()) AND created_by = auth.uid());

CREATE TRIGGER set_ingestion_mapping_rules_updated_at
  BEFORE UPDATE ON public.ingestion_mapping_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ingestion_mapping_rules_owner ON public.ingestion_mapping_rules(created_by);
CREATE INDEX idx_ingestion_mapping_rules_pattern ON public.ingestion_mapping_rules(pattern_kind, pattern);

-- ============================================
-- ingestion_results
-- ============================================
CREATE TABLE public.ingestion_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.ingestion_files(id) ON DELETE CASCADE,
  status public.ingestion_result_status NOT NULL,
  created_entity_kind text,
  created_entity_id uuid,
  created_entity_table text,
  notes text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view own ingestion results"
  ON public.ingestion_results FOR SELECT TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can insert own ingestion results"
  ON public.ingestion_results FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE POLICY "team can delete own ingestion results"
  ON public.ingestion_results FOR DELETE TO authenticated
  USING (
    public.is_team_member(auth.uid()) AND
    EXISTS (SELECT 1 FROM public.ingestion_runs r WHERE r.id = run_id AND r.created_by = auth.uid())
  );

CREATE INDEX idx_ingestion_results_run ON public.ingestion_results(run_id);
CREATE INDEX idx_ingestion_results_file ON public.ingestion_results(file_id);

-- ============================================
-- ingestion_object_registry (canonical importable types)
-- ============================================
CREATE TABLE public.ingestion_object_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type text NOT NULL UNIQUE,
  display_name text NOT NULL,
  target_table text NOT NULL,
  required_fields text[] DEFAULT ARRAY[]::text[],
  optional_fields text[] DEFAULT ARRAY[]::text[],
  description text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_object_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can read object registry"
  ON public.ingestion_object_registry FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

CREATE POLICY "admins can write object registry"
  ON public.ingestion_object_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER set_ingestion_object_registry_updated_at
  BEFORE UPDATE ON public.ingestion_object_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the registry from the canonical entities
INSERT INTO public.ingestion_object_registry (object_type, display_name, target_table, required_fields, optional_fields, description, sort_order) VALUES
  ('component',       'Component',        'components',        ARRAY['name'], ARRAY['description','component_kind','questions_it_answers'], 'A reusable building block of a service or product.', 10),
  ('journey',         'Journey',          'journeys',          ARRAY['name'], ARRAY['description','status'],                                  'A capability-development arc.',                       20),
  ('persona',         'Persona',          'personas',          ARRAY['name'], ARRAY['description'],                                            'A target audience archetype.',                        30),
  ('relationship',    'Relationship',     'relationships',     ARRAY['name'], ARRAY['notes'],                                                  'A client or contact record.',                          40),
  ('document',        'Document',         'documents',         ARRAY['name'], ARRAY['type','notes'],                                           'A working artifact or deliverable.',                  50),
  ('decision',        'Decision',         'decisions',         ARRAY['decision'], ARRAY['context','implications'],                              'A captured strategic decision.',                       60),
  ('jtbd',            'Job to be Done',   'jobs_to_be_done',   ARRAY['name'], ARRAY['description'],                                            'A jobs-to-be-done definition.',                        70),
  ('quest',           'Quest',            'quests',            ARRAY['name'], ARRAY['description'],                                            'A live progression unit for a relationship.',          80),
  ('mission',         'Mission',          'missions',          ARRAY['name'], ARRAY['description','status'],                                   'A mission-level outcome.',                             90),
  ('domain',          'Domain',           'domains',           ARRAY['name','slug'], ARRAY['description','color'],                              'An excellence domain.',                                100),
  ('tenet',           'Tenet',            'tenets',            ARRAY['name','slug'], ARRAY['description'],                                     'A guiding tenet.',                                     110),
  ('campaign',        'Campaign',         'campaigns',         ARRAY['campaign_name'], ARRAY['goal','notes'],                                 'A campaign or outreach effort.',                       120),
  ('project',         'Project',          'projects',          ARRAY['name'], ARRAY['description','status'],                                   'A project record.',                                    130),
  ('task',            'Task',             'tasks',             ARRAY['name'], ARRAY['description','status','priority'],                        'A unit of work.',                                      140),
  ('operator',        'Operator',         'operators',         ARRAY['name'], ARRAY['kind','notes'],                                           'A human, agent, or workflow operator.',                150),
  ('session_template','Session Template', 'session_templates', ARRAY['name'], ARRAY['description'],                                            'A reusable session blueprint.',                        160);

-- ============================================
-- Storage bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ingestion', 'ingestion', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ingestion: owners can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ingestion' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ingestion: owners can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ingestion' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ingestion: owners can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ingestion' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ingestion: owners can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ingestion' AND auth.uid()::text = (storage.foldername(name))[1]);
