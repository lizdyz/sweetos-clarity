-- Helper: insert canon row for one (lens, subject) pair using lens.stages
DO $$
DECLARE
  _lens RECORD;
  _subj RECORD;
  _stages_json jsonb;
  _stage text;
BEGIN
  FOR _lens IN
    SELECT id, code, name, tagline, stages
    FROM public.lenses
    WHERE enabled = true AND code IN ('F1','F2','F3','F4','F5','F6','F7','F8')
    ORDER BY sort_order
  LOOP
    FOR _subj IN
      SELECT 'tenet'::text AS subject_kind, id AS subject_id, name AS subject_name
      FROM public.tenets
      WHERE slug IN (
        'strategic-vision-purpose',
        'leadership-team-development',
        'operational-excellence',
        'financial-mastery',
        'marketing-positioning'
      )
      UNION ALL
      SELECT 'domain'::text AS subject_kind, id AS subject_id, name AS subject_name
      FROM public.domains
      WHERE slug IN (
        'strategy-positioning',
        'client-segmentation',
        'marketing-brand',
        'sales-discovery',
        'service-delivery'
      )
    LOOP
      -- Skip if already exists
      IF EXISTS (
        SELECT 1 FROM public.lens_canon
        WHERE lens_id = _lens.id
          AND subject_kind = _subj.subject_kind
          AND subject_id = _subj.subject_id
      ) THEN
        CONTINUE;
      END IF;

      -- Build stages_breakdown from the lens's stages
      _stages_json := '[]'::jsonb;
      FOREACH _stage IN ARRAY _lens.stages LOOP
        _stages_json := _stages_json || jsonb_build_array(jsonb_build_object(
          'stage', _stage,
          'summary', format('How %s shows up in the "%s" stage of the %s lens. Replace this with the team''s curated take.', _subj.subject_name, _stage, _lens.name),
          'bullets', jsonb_build_array(
            format('What "%s" looks like for %s at this stage.', _stage, _subj.subject_name),
            'Key signal we watch for to confirm we''re here.',
            'Concrete artifact or behavior that proves the stage is in place.'
          ),
          'watch_outs', jsonb_build_array(
            format('Common way teams misread the "%s" stage of %s.', _stage, _subj.subject_name),
            'Anti-pattern to avoid.'
          ),
          'next_actions', jsonb_build_array(
            format('Highest-leverage move to advance %s through "%s".', _subj.subject_name, _stage),
            'Smallest deliberate experiment to learn faster.'
          )
        ));
      END LOOP;

      INSERT INTO public.lens_canon (
        lens_id, subject_kind, subject_id,
        quick_facts, perspective_md, key_questions, watch_outs, next_actions,
        stages_breakdown, source, status, notes
      ) VALUES (
        _lens.id, _subj.subject_kind, _subj.subject_id,
        ARRAY[
          format('Lens: %s — %s', _lens.name, _lens.tagline),
          format('Subject: %s', _subj.subject_name),
          format('Walks %s through %s stages: %s', _subj.subject_name, array_length(_lens.stages, 1), array_to_string(_lens.stages, ' → '))
        ],
        format(E'## %s × %s\n\nThis is the **starter canon** for viewing **%s** through the **%s** lens. Refine each stage with the team''s real best-practice take. Every edit is captured in revision history; mark this entry as "active" once it reflects what good actually looks like.', _lens.name, _subj.subject_name, _subj.subject_name, _lens.name),
        ARRAY[
          format('What does the %s lens force us to ask about %s that we usually skip?', _lens.name, _subj.subject_name),
          format('Where in the %s lifecycle is %s typically weakest?', _lens.name, _subj.subject_name),
          format('Which stage of %s, when done well, unlocks the most downstream value for %s?', _lens.name, _subj.subject_name)
        ],
        ARRAY[
          format('Treating %s as a checklist instead of an iterative practice.', _subj.subject_name),
          format('Skipping early stages of %s because they feel obvious.', _lens.name),
          'Generic advice that doesn''t reflect this team''s actual context.'
        ],
        ARRAY[
          format('Walk %s through every stage of %s with the responsible operator.', _subj.subject_name, _lens.name),
          format('Capture one concrete example per stage to ground future Sparks.', _subj.subject_name),
          'Promote a great AI take into this canon when one earns it.'
        ],
        _stages_json,
        'curated', 'draft',
        'Starter canon — refine into the team''s real best-practice take.'
      );
    END LOOP;
  END LOOP;
END $$;