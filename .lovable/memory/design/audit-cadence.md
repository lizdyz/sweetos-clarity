---
name: Audit cadence
description: Run a 4-pass system audit (security, route consolidation, file-size, architectural) after every 5 feature additions. No route ships without a sidebar entry; no view without an entry in supabase/VIEWS.md.
type: preference
---

# Audit cadence

After every ~5 feature additions, run the standing 4-pass audit:

1. **Security & DB hygiene** — `supabase--linter` clean, every view has `security_invoker = true`, every function has `search_path = public`.
2. **Route consolidation** — every route in `src/routes/` is reachable from `src/components/app-sidebar.tsx` exactly once, or has an explicit redirect. Orphan routes get retired.
3. **File-size & type-safety** — no app file over 600 lines without a refactor plan; no `as any` casts in app code (autogen files exempt).
4. **Architectural alignment** — `QueryClient` lives in `getRouter` factory (not module singleton), `<CanonGuardrail>` mounted on every entity detail page, no stray `console.log`.

## Hard rules
- **No new route ships without a sidebar entry** (or an explicit redirect).
- **No new view ships without an entry in `supabase/VIEWS.md`** + `security_invoker = true`.
- **No new database function ships without `SET search_path = public`**.

## Headline KPI

**Canon misses** (count of `detected_by: "presence_check"` violations from `/settings/ux-audit`) is the headline KPI for canon health — not the AI scores. The AI score is judgment; canon misses are mechanical truth. Target: 0 canon misses on every entity_detail / actionable_detail / measure_subject / index route.

## Why
The system accumulates orphans, monster files, and security drift faster than features ship. A standing audit cadence keeps it cheap to fix; one big rewrite is expensive and breaks trust.
