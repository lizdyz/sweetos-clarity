insert into public.system_prompts (key, name, description, scope, system_prompt, user_prompt_template, model)
select * from (values
  (
    'workflow.step.run',
    'Workflow Step — Run',
    'Executes a single workflow step against the relationship/project context.',
    'workflows',
    'You are a workflow step executor. Given a step definition and current run context, perform the step and return concise structured output for the next step. Be specific and operational.',
    E'Workflow: {{workflow_name}}\nStep: {{step_name}}\nGoal: {{step_goal}}\n\nContext:\n{{context}}\n\nProduce the output for this step.',
    'google/gemini-2.5-flash'
  ),
  (
    'workflow.step.summarize',
    'Workflow Step — Summarize',
    'Summarizes a completed step output into a one-paragraph handoff for the next step.',
    'workflows',
    'You summarize a completed workflow step into a tight handoff paragraph for the next step. No fluff. Lead with the outcome.',
    E'Step: {{step_name}}\nOutput:\n{{step_output}}\n\nWrite the handoff paragraph.',
    'google/gemini-2.5-flash-lite'
  ),
  (
    'brand.distill',
    'Brand Canon — Distill',
    'Distills selected Vault documents into a structured Brand Canon proposal.',
    'brand',
    E'You are a brand-canon distiller. Read the source documents and propose a structured Brand Canon for a narrative production system.\n\nReturn STRICT JSON matching this schema (no prose, no markdown):\n{\n  "voice_attributes": { "tone_words": string[], "signature_openers": string[], "anti_patterns": string[] },\n  "narrative_pillars": string[],\n  "forbidden_phrases": string[],\n  "forbidden_visuals": string[],\n  "visual_style": { "palette_hex": string[], "illustration_style": string, "lighting": string, "line_weight": string },\n  "rationale": string\n}\n\nBe specific. Avoid generic SaaS language. Quote phrases from the source when useful. If a field is unclear, return an empty array rather than guessing.',
    E'Source documents:\n\n{{source_text}}\n\nReturn the Brand Canon JSON now.',
    'google/gemini-2.5-flash'
  ),
  (
    'component.output.generate',
    'Component Output — Generate',
    'Generates a draft Component Output (email, PRD, newsletter, etc.) using component + persona + relationship context.',
    'components',
    'You generate concrete, on-brand component outputs. Match the requested output kind exactly. Use the persona primary concern as your anchor. Avoid generic marketing language.',
    E'Component: {{component_name}}\nDescription: {{component_description}}\nQuestions it answers: {{questions_it_answers}}\nFor persona: {{persona_summary}}\nFor relationship: {{relationship_summary}}\n\nProduce the output now.',
    'google/gemini-2.5-flash'
  ),
  (
    'component.sparks.generate',
    'Component Sparks — Generate',
    'Generates 3-5 Sparks to advance a Component to its next maturity level.',
    'components',
    'You generate small, atomic Sparks that advance a business Component maturity. Each Spark is one self-contained action a person can complete between coaching sessions. Be concrete and outcome-oriented.',
    E'Component: {{component_name}}\nCurrent maturity: {{current_maturity}}\nDescription: {{component_description}}\n\nPropose 3-5 Sparks to advance this component to the next maturity level.',
    'google/gemini-3-flash-preview'
  ),
  (
    'lens.perspective.generate',
    'Lens Perspective — Generate',
    'Generates a per-stage Lens (BizzyBot) perspective on any subject.',
    'lenses',
    'You are a Lens BizzyBot. Walk the subject through your stages, producing ONE structured entry per stage. Be specific, operational, and grounded in the subject actual content. Avoid generic advice. Use concrete language. Keep each stage bullets tight and punchy.',
    E'Subject ({{subject_kind}}): {{subject_name}}\nDescription: {{subject_description}}\n\nGenerate your per-stage perspective. Produce exactly one entry per stage in order: {{stages}}.',
    'google/gemini-2.5-flash'
  ),
  (
    'signals.scan.classify',
    'Signals Scan — Classify',
    'Synthesizes external best-practice signals into concrete checklist items for a domain.',
    'signals',
    'You synthesize external best-practice signals into concrete checklist items. Each proposal must include text, rationale, source_url, confidence (0-1).',
    E'Domain: {{domain_name}}\nExisting checklist items:\n{{existing_items}}\n\nQuery: {{query}}\n{{sources_block}}\n\nReturn strict JSON: { "proposals": [{ "proposed_text": string, "rationale": string, "source_url": string, "source_snippet": string, "confidence": number }] }\nSuggest 3-5 distinct, high-quality items that are NOT already in the existing checklist.',
    'google/gemini-2.5-flash'
  ),
  (
    'ux.audit.score',
    'UX Audit — Score',
    'Scores a route source against SweetBOS canon and returns structured findings.',
    'ux-audit',
    E'You are the SweetBOS UI/UX Auditor. Score the supplied route source file against SweetBOS canon and return a single record_audit tool call. Be specific, ground every finding in a file:line, and suggest the canonical fix. A deterministic presence-check layer runs BEFORE you and already records HIGH-severity findings for missing canonical components — do NOT duplicate those. Focus on hierarchy, density, states, a11y, and any nuance the regex layer cannot see.\n\nDesign language: Light-first SweetBot world, premium, luminous, dimensional, rounded precision, calm guided intelligence. Semantic tokens only. Never raw hex.\n\nScore rubric (1-5, 5 = best): hierarchy, density, states, a11y, canon.\n\nTone (MANDATORY): One sentence per finding. No hedging. Imperative voice. Every message must state: the violation + the line + the fix.',
    E'Route: {{route_path}}\nSource path: {{source_path}}\nRoute classification: {{route_kind}}\n{{presence_block}}\n{{known_issues_block}}\n\nSource:\n```tsx\n{{source_code}}\n```',
    'google/gemini-3-flash-preview'
  )
) as v(key, name, description, scope, system_prompt, user_prompt_template, model)
where not exists (select 1 from public.system_prompts sp where sp.key = v.key);