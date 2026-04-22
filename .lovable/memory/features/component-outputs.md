---
name: Component outputs
description: Mature components produce typed deliverables (email, newsletter, PRD, etc.) via editable system prompts
type: feature
---
Components ship usable assets via `component_outputs` table. Output kinds: email, newsletter, prd, playbook, one_pager, spec, script, template, presentation, workflow_doc, training, other. Lifecycle: draft → in_review → approved → published → retired. Each kind has its own editable system prompt in `system_prompts` keyed `output.<kind>`. Generation runs in edge function `generate-component-output` which stitches Component + Persona + Relationship context into the prompt. Approved outputs with `visibility='client_shared'` surface in the client portal. Render via `<ComponentOutputGenerator componentId>`.
