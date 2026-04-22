---
name: UX Auditor
description: In-app /settings/ux-audit cockpit + ux-audit edge function that scores routes against SweetBOS canon and persists runs in ux_audit_runs
type: feature
---

# UX Auditor loop

Manual-fire auditor that grades any route against canon and stores results.

**Surface**: `/settings/ux-audit` — pick a route, optionally paste known UX issues, click "Run audit".

**Edge function**: `supabase/functions/ux-audit/index.ts`
- Reads route source (sent from client)
- Calls Lovable AI (`google/gemini-3-flash-preview`) with a tool-call schema
- Persists scored result + findings in `ux_audit_runs`

**Schema**: `ux_audit_runs(route_path, source_path, scores jsonb, findings jsonb, guardrails_missing text[], ux_issues_user_reported text[], status open|acknowledged|fixed)`

**Score axes (1–5)**: hierarchy · density · states · a11y · canon

**Canon rules enforced**: Stage-as-Board · Views-are-Truth · TimeControls on actionables · MeasuresPanel · 8 BizzyBot Lenses · Sparks system-only · Domains⊥Tenets · 7-group sidebar · CanonGuardrail on entity detail.

**Cost control**: never auto-fires. Click required.

**Prompt iteration**: System prompt lives in the edge function. Polished version produced by external LLM via `/mnt/documents/ux-auditor-briefing.md`. Update the `SYSTEM_PROMPT` constant when iterated.

**How to add a route to the cockpit**: append to `AUDIT_TARGETS` in `src/routes/_app.settings.ux-audit.tsx`.
