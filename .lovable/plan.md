

# Phase 2.10m: Engagement-plan clarity, scheduling everywhere, per-stage Lens breakdown, editable BizzyBot prompts

Four real fixes, not five. Each maps directly to what you said.

---

## 1. "What is an engagement plan?" — make the page actually show it

Today the page is a thin EntityListPage with one paragraph. Replace the detail page with a real anatomy view so anyone clicking it instantly understands.

**`/engagement-plans` (index)** — keep grid + add a **What is this** explainer card at top:
> An Engagement Plan is the **contract shape** for one relationship over a stretch of time (usually 3–12 months). It bundles the **services purchased** (e.g. *1 Mirror + 3 Maps + Sync*), the **roadmap** of which Domains/Tenets we'll move, the **revenue terms**, and the **expected sessions**. Each Plan rolls into SweetCycle (per-client journey) and Flightdeck (cross-client cockpit).

**`/engagement-plans/$id` (detail)** — restructured layout:
```text
┌─ Header: Relationship · Status · Term dates · Revenue ──┐
│                                                          │
├─ Service Shape strip (Mirror · Map x3 · Sync)            │
├─ Timeline (TimeControls: started · scheduled · due · done│
│   + Recurrence) — wires to engagement_plans table        │
├─ Services table (each row = engagement_services row)     │
│   ↳ click a service → sessions list + Measures           │
├─ Roadmap: target Domains/Tenets to move (chips)          │
├─ Sessions calendar mini-strip (auto-pulled)              │
├─ Documents · Decisions · Audit trail                     │
└─ MeasuresPanel (plan-level KPIs: NPS, retention, etc.)   │
```

Mount `<TimeControls table="engagement_plans">`, `<TimeControls table="engagement_services">` on each service row, and `<TimeControls table="sessions">` on each session.

---

## 2. "What happened to all the timing & scheduling?" — it's still there, just not surfaced everywhere

The `<TimeControls>` component is mounted on tasks, projects, campaigns, missions, sparks, outcomes. **Missing on**: sessions, engagement_plans, engagement_services, quests, journeys, decisions, documents, playbooks, session-templates, components, relationships, domain-assessments. Add `<TimeControls>` to every actionable detail page so the five time fields (created · not_before · scheduled_for · due · done) + recurrence are visible everywhere.

Also surface the time fields in the **list views** — add `DueDateChip` + `ScheduledChip` columns to:
- `/sessions` index
- `/engagement-plans` index
- `/quests`, `/journeys`, `/decisions`, `/documents`, `/playbooks`

And on the Calendar page header add a small legend explaining what entity types appear and how the colors map.

---

## 3. Per-stage Lens breakdown + auto-run on first visit + editable prompts

This is the big one. Three sub-fixes that work together.

### 3a. Schema: store each stage of each framework as its own structured component

Today `lens_perspectives.perspective_md` is one markdown blob. Replace the storage shape so each stage of each framework (e.g. for OCDA: **Observe / Collect / Decide / Act**) is its own renderable card.

```sql
ALTER TABLE lens_perspectives
  ADD COLUMN stages_breakdown jsonb DEFAULT '[]'::jsonb;
-- shape: [{ stage: "Observe", summary: "…", bullets: ["…"], watch_outs: ["…"], next_actions: ["…"] }, …]
```

Old `perspective_md` stays for backward-compat; new generations populate both.

Add to `lenses` so admins can author the prompt per BizzyBot:
```sql
ALTER TABLE lenses
  ADD COLUMN system_prompt text,           -- editable; falls back to auto-built prompt
  ADD COLUMN user_prompt_template text,    -- with {{subject_name}} / {{subject_description}} / {{stages}} placeholders
  ADD COLUMN model text DEFAULT 'google/gemini-3-flash-preview';
```

### 3b. Edge function rewrite: generate per-stage, store per-stage

Update `generate-lens-perspectives`:
- For each Lens, the tool schema becomes `stages_breakdown: [{ stage, summary, bullets, watch_outs, next_actions }]` with `length === lens.stages.length`.
- The system prompt used is `lens.system_prompt` if present, otherwise the current auto-built one. Same for user prompt template.
- Insert into `lens_perspectives` with both `perspective_md` (joined for legacy) and `stages_breakdown`.
- Write to `entity_audit_log` for every generation (provenance).

### 3c. Auto-run on first visit + UI shows per-stage cards

`<LensWall>`:
- On mount: if `perspectives` for this subject is empty → fire `generate.mutate(false)` once automatically.
- Toast says: "First time on this {domain/tenet} — running all 8 BizzyBots…"
- After that, the data persists. The header button stays "Regenerate" for manual re-run.

`<LensPerspectiveCard>`:
- When `stages_breakdown` has items, render a **horizontal stage stepper** at top (current stage glows in the lens accent color), with the body switching to show that stage's summary + bullets + watch-outs + next-actions.
- Falls back to today's `perspective_md` rendering when `stages_breakdown` is empty (legacy data).

```text
┌─ OCDA · Strategic Vision ────────────────────────────────┐
│ 🧭  [Observe]→[Collect]→[Decide]→[Act]                   │
│      ●          ○          ○        ○                    │
│ ───────────────────────────────────────────────────────  │
│ Observe                                                  │
│ Summary: …                                               │
│ • bullet                                                 │
│ • bullet                                                 │
│ Watch-outs: …                                            │
│ Next actions: …                                          │
└──────────────────────────────────────────────────────────┘
```

So each Domain page becomes: **Crib sheet** (top) → **Excellence rubric** → **Lens wall** = 8 cards × N stages = the full BizzyBot field guide, all populated.

### 3d. Admin: edit the system prompt right where it lives

New route **`/settings/lenses`** (admin-only):
- List of the 8 BizzyBots.
- Click one → editor with: name, tagline, what-it-asks, best-use, stages (drag-reorder), **system_prompt** textarea (with placeholder hints), **user_prompt_template**, model picker (Gemini Flash / Pro / GPT-5-mini), bizzybot_emoji.
- "Test prompt" button — runs against a sample subject, shows the structured output.
- Saves → next generation uses your new prompt. Old perspectives keep their original `generated_by_model` stamp for provenance.

Add to sidebar under Settings: **Settings → BizzyBot prompts**.

---

## 4. Schema + files

### Migration `<ts>_lens_stages_and_prompts.sql`
```sql
ALTER TABLE lens_perspectives ADD COLUMN stages_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE lenses
  ADD COLUMN system_prompt text,
  ADD COLUMN user_prompt_template text,
  ADD COLUMN model text NOT NULL DEFAULT 'google/gemini-3-flash-preview';
CREATE INDEX idx_lens_perspectives_stages ON lens_perspectives USING gin (stages_breakdown);
```

### Files

**New:**
- `src/components/lens-stage-stepper.tsx` — horizontal stage selector inside a perspective card.
- `src/components/engagement-plan-anatomy.tsx` — the new detail layout.
- `src/components/engagement-service-row.tsx` — per-service expandable row with sessions + measures.
- `src/routes/_app.settings.lenses.tsx` — admin BizzyBot prompt editor.
- `src/routes/_app.settings.lenses.$id.tsx` — single lens editor.

**Edited:**
- `supabase/functions/generate-lens-perspectives/index.ts` — per-stage tool schema, use `lens.system_prompt` if set, write `stages_breakdown`, log to `entity_audit_log`.
- `src/components/lens-wall.tsx` — auto-run on empty mount; pass through stages_breakdown.
- `src/components/lens-perspective-card.tsx` — render `<LensStageStepper>` when stages_breakdown present.
- `src/lib/lens-types.ts` — add `stages_breakdown: Array<{stage, summary, bullets, watch_outs, next_actions}>`.
- `src/routes/_app.engagement-plans.index.tsx` — explainer card.
- `src/routes/_app.engagement-plans.$id.tsx` — full anatomy layout.
- `src/components/app-sidebar.tsx` — Settings → BizzyBot prompts link.
- All actionable detail routes missing `<TimeControls>` (sessions, quests, journeys, decisions, documents, playbooks, session-templates, components, relationships, domain-assessments).
- List views above — add `DueDateChip` + `ScheduledChip` columns.

**Memory:**
- `mem://design/lenses-bizzybots.md` — append: "Each Lens generates per-stage cards stored in `lens_perspectives.stages_breakdown`. System prompts editable per Lens via `lenses.system_prompt`. First visit to a Domain/Tenet auto-runs generation."
- `mem://features/work-graph-time.md` — append: "`<TimeControls>` mounted on every actionable detail page including sessions, engagement_plans, engagement_services, quests, journeys, decisions, documents."

## What I'm NOT doing this pass

- Live BizzyBot chat — still queued.
- Per-stage curator agents (one agent per stage) — overkill; one agent per Lens stays the unit.
- Re-generating old perspectives in bulk — old data renders via the markdown fallback; you regenerate when you want.
- Workflow DAG editor — still queued.

## Suggested order after

1. **2.10m (this plan)** — anatomy + scheduling everywhere + per-stage lens cards + admin prompts.
2. **First custom-prompted BizzyBot** — author OCDA's prompt, regenerate one Domain, compare quality.
3. **Lens-aware MeasuresPanel** — "suggest measures from CSFs each Lens highlighted."
4. **Branching workflows + DAG editor.**

