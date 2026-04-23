

# Wave 14 — Frictionless onboarding: Capture-from-here + Gap-Closer mode

You're flagging the highest-leverage UX problem in the system: **getting information *in* is still a separate destination.** Three changes turn capture from a place you visit into a thing that follows you around — and then a thing the system does *for* you when you toggle it on.

## Part 1 — "Capture here" button on every page

A new control mounts inside `<PageHeader>` (already on every route). Click → a popover opens with:

- **Mic-on-by-default** big record button (uses the existing `SpeechRecognition` hook from `/capture`).
- **A coverage checklist** above the mic showing *what to talk about for this page* — derived from the page's entity canon (see Part 2).
- **Live transcript** below.
- **Stop & Stage** writes a `proposals` row pre-tagged with `source_page`, `subject_kind`, `subject_id` so it skips the entity-classifier and goes straight into the existing pollination pipeline scoped to that subject.

```text
┌─ /relationships/acme ─────────────────────────────┐
│ [🎙 Capture for Acme]   ← in the page header     │
│                                                    │
│  Talking about Acme? Hit any of these:            │
│   ○ Current pain or wedge moment                  │
│   ○ Decision they're stuck on                     │
│   ○ Who else is in the room                       │
│   ○ What "good" looks like in 90 days             │
│   ○ Any KTI evidence you've seen                  │
│                                                    │
│  ●REC  47s   "…they keep asking how to price…"    │
│  [ Stop & stage ]                                 │
└────────────────────────────────────────────────────┘
```

The capture lands as a normal proposal — but because it carries `subject_kind=relationship, subject_id=<acme>`, the existing `capture.match.*` passes already filter their search space (Acme's personas, JTBDs, KTIs, quests). Same pipeline, much higher signal.

## Part 2 — `entity_canon.capture_prompts` (the dropdown of vital points)

The "what to talk about" list is not invented per-page — it's a property of the entity kind, stored in `entity_canon`. New column:

```sql
alter table entity_canon
  add column capture_prompts text[] default '{}';
```

Seed it for the 17 canon kinds with 4–7 prompts each (Relationship gets the list above; Project gets "what's blocking · what shipped · who saw the artifact · is the JTBD still right"; Persona gets "fresh quote · changed circumstance · new objection"; etc.).

The PageHeader popover reads `capture_prompts` for the current entity kind and renders them as the checklist. Editing them is a one-row update from `/settings/canon` — already an admin surface.

## Part 3 — Gap-Closer mode (the "system works for us" toggle)

A new switch in the topbar (next to the bell): **`Auto-spark gaps`**.

When ON, a backend cron (every 6h via `pg_cron` + a server route) runs `gap-scanner.run`:

1. Walks every active `relationship` / `persona` / `quest` / `kti`.
2. For each, checks coverage against canon: do we have a recent capture? a JTBD? evidence for the KTIs that should fire? a Spark in the last 30 days?
3. For each gap, spawns a **system-attributed Spark** (`generated_by_kind='agent'`, generator op = `gap_scanner`) with a focused question:
   - *"Acme: no capture in 21 days — what changed since last session?"*
   - *"KTI 'rising churn' has 0 readings this week — anything in inbound signals?"*
   - *"Persona 'Wealth Advisor' has 2 JTBDs but 0 work instances against either — propose a campaign?"*

Sparks land where they already do (`/sparks`, embedded in Today, surfaced by `<TriageCard>`). User triages with the existing universal gesture. **Nothing new on the read side.**

A small `gap_scan_runs` table records each pass for audit + the existing Prompt Console gets one new row (`gap.scanner.propose`) so you can edit the Spark prompt template.

```text
text ──▶ [gap_scanner cron] ──▶ for each entity:
                                 ├─ canon.coverage_rules ↔ actual data
                                 ├─ if gap → generate spark via getPrompt('gap.scanner.propose')
                                 └─ insert spark with provenance back to subject
```

Coverage rules are also canon-driven — a new `coverage_rules` jsonb on `entity_canon`:

```jsonc
{
  "stale_capture_days": 21,
  "require_jtbd_link": true,
  "require_active_kti": true,
  "min_sparks_per_quarter": 1
}
```

Default sensible values; admin can tighten per kind from `/settings/canon`.

## Files

**New backend:**
- One migration: `entity_canon.capture_prompts text[]`, `entity_canon.coverage_rules jsonb`, `gap_scan_runs` table, seed `capture_prompts` for all 17 canon kinds, seed `gap.scanner.propose` system_prompt row.
- `src/routes/api/public/hooks/gap-scan.ts` — server route that pg_cron hits every 6h (HMAC-protected). Uses `getPrompt` + the agent-attributed Spark insert path.

**New frontend:**
- `src/components/page-capture-button.tsx` — the in-PageHeader mic+checklist popover. Takes `subjectKind`, `subjectId`, optional `subjectLabel`. Reads `entity_canon.capture_prompts` for the kind. Reuses the existing SpeechRecognition + `captureProposal` flow.
- `src/components/gap-closer-toggle.tsx` — topbar switch; flips `org_settings.gap_closer_enabled`.

**Edited:**
- `src/components/page-header.tsx` — accept optional `subjectKind` / `subjectId` and slot the capture button in the actions area.
- `src/components/app-topbar.tsx` — mount `<GapCloserToggle/>`.
- `src/routes/_app.settings.canon.tsx` — add `capture_prompts` and `coverage_rules` editors to each canon row.
- The ~25 detail routes (`_app.relationships.$id.tsx`, `_app.projects.$id.tsx`, `_app.personas.$id.tsx`, etc.) — pass `subjectKind="relationship"` etc. into `<PageHeader>`. One-line each.
- `src/utils/proposals.functions.ts` — accept optional `subject_kind`, `subject_id` on input; persist to proposal; the persona/JTBD/quest match passes prefilter their library by these IDs when present.

**Cron seed (separate migration):**
- `select cron.schedule('gap-scanner', '0 */6 * * *', $$ select net.http_post(url := '<published>/api/public/hooks/gap-scan', headers := …) $$)`

**Memory:**
- `mem://design/capture-everywhere.md` — codify the `<PageHeader subjectKind/subjectId>` contract and the canon-driven `capture_prompts` rule.
- `mem://features/gap-closer.md` — codify how the scanner reads `coverage_rules` and writes Sparks.

## Sequencing

1. Migration: `capture_prompts`, `coverage_rules`, `gap_scan_runs`, seed all 17 kinds (~20%)
2. `<PageCaptureButton>` + PageHeader integration + the 25 route prop wires (~25%)
3. `proposals.functions.ts` accepts subject context + scopes match passes (~10%)
4. `/settings/canon` editors for `capture_prompts` + `coverage_rules` (~10%)
5. `gap-scan` server route + cron + `gap.scanner.propose` prompt (~20%)
6. `<GapCloserToggle>` in topbar + `org_settings` flag + memory docs (~15%)

## Not in this wave

- No new top-level routes
- No sidebar changes
- No new "modes" beyond the single Gap-Closer toggle
- Whisper / server-side transcription stays out — browser `SpeechRecognition` is good enough for v1
- No edits to auto-generated files

## After Wave 14

- Every page has a one-click capture button **that knows what to ask for on that page** (canon-driven prompts).
- The same capture flows through the existing pollination pipeline, but pre-scoped to the page's subject — so matches are tighter and faster.
- Flip one switch and the system *itself* starts hunting gaps — every 6 hours it walks the active surface area and drops Sparks where coverage is thin, using your existing universal triage gesture as the response surface.
- All of this is canon-controlled: `capture_prompts` and `coverage_rules` live in `entity_canon`, editable from `/settings/canon`, version-tracked by the existing `entity_canon_revisions` trigger.

Reply **"Run Wave 14"** to ship in this order, or **"Just the per-page capture button first"** to land the highest-impact piece before the gap scanner.

