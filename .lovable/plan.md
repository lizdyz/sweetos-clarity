

# Phase 2.10o: UX sweep — Planner, Calendar, Capture+Queue, BizzyBots reorg, master prompt console, OCDA pipeline

Six tightly-scoped fixes pulled straight from what you said. All about **fewer clicks, more clarity, less hunting.**

---

## 1. Planner — hold anything, filter everything, fewer clicks

**Today:** only Tasks/Projects/Campaigns, one tiny "+" per lane, no filters.

**Fixes:**
- **Hold more kinds in lanes:** Tasks · Projects · Campaigns · **Sessions · Engagement Plans · Quests · Decisions**. Anything with a `scheduled_for` is plannable.
- **Smart "+ Add" per lane:** the `+` opens a tiny popover with a kind picker (Task / Project / Campaign / Session / Decision) + one input. Default is Task. One click stays one click; advanced is one extra click.
- **Filter strip** at top: Mine · Relationship · Domain · Operator · Kind. Multi-select chips, persisted in URL search params so a filtered Planner is shareable.
- **Workload bar** under each lane: visual fill (`task count → 2px = 1 task`) so overload jumps out without reading numbers.
- **Click a card → opens a side sheet** with `<TimeControls>` + status + assignee, no full navigation. Saves ~3 clicks per reschedule.

---

## 2. Calendar — clickable days, multiple zooms, real interactivity

**Today:** click a day = nothing. Click an event = navigates away. Only month view.

**Fixes:**
- **Three zoom levels** toggle: **Day · Week · Month** (segmented control top-right). State in URL.
- **Click a day cell** → opens a **day-preview sheet** listing every event that day, with inline `<TimeControls>`, status, and an "Open" link. No navigation required.
- **Click an event chip** → same sheet, scrolled to that event. The chip itself no longer navigates; it previews.
- **Filter strip** mirrors Planner (Mine · Relationship · Domain · Operator · Kind).
- **Add events on the calendar:** click an empty day → "+ Add" button in the preview → quick-create with kind picker (Task / Session / Decision).
- **Drag to reschedule** in week and month views (already half-there in the codebase pattern; finish wiring).

---

## 3. Capture + Queue = one screen

**Today:** capture, then click → queue, then approve. Two screens, two trips.

**Fix:** single page **`/capture`** with two stacked panels:
- **Top:** the existing capture composer (text / mic / file drop), unchanged.
- **Bottom:** a live **Proposals strip** (most recent 10 pending), with inline approve / reject / hold buttons + tag confirm chips. No navigation. The full `/queue` page stays for power-users; sidebar label becomes "Proposals (full)".
- **Realtime:** subscribe to the `proposals` table so a brand-new capture lands at the top of the strip in <1s.

---

## 4. BizzyBots → live with Operators, +1 missing bot, framework tiles

**Today:** BizzyBots are tucked under Settings only; sidebar shows them as a single block; only 8 seeded; no easy way to ask "what would this Lens say about this Person/Project/Domain?"

**Fixes:**
- **Add the missing 9th BizzyBot.** Eight are seeded (F1–F8). I'll ask you which is the 9th below — pick from a short list or type your own — then seed it.
- **BizzyBots become first-class Operators.** A new sidebar item under **Operate → BizzyBots** opens a gallery (one tile per Lens) showing avatar, tagline, stages, "Ask this Bot…" picker (Domain / Tenet / Project / Relationship / Component → fires generation against any subject), and a recent-perspectives feed. They stay editable in Settings.
- **Framework tile pattern:** on Domain & Tenet detail pages the LensWall becomes a **grid of 9 lens tiles**. Click a tile → expands inline (no navigation) to show that lens's per-stage cards + the dropdown "Apply this lens to → {Person / Project / Component / Relationship}". This is the "what is their reality in this scope?" UX you described.
- **Visual surface:** each tile gets the lens accent color and BizzyBot avatar; collapsed = peek (tagline + last-generated date), expanded = full per-stage breakdown.

---

## 5. One master Prompt Console

**Today:** lens prompts live at `/settings/lenses`. Capture parser prompt, proposal-tagger prompt, curator-agent prompts are scattered or hardcoded.

**Fix:** new **`/settings/prompts`** route — one master page listing every editable system prompt in the system, grouped:
- **BizzyBot lenses** (9 entries) — link out to the per-lens editor (existing).
- **Capture & Queue** — `parse-capture`, `infer-tags`, `match-existing-record`.
- **Curator agents** — per-domain, per-tenet, per-lens curators (the schema added in 2.10n).
- **Signal scanners** (new, see §7).
- **OCDA Cockpit** (new, see §6).

Each row: name · scope · last edited · model · "Edit" → opens a side sheet with system_prompt + user_prompt_template + model picker + "Test" button. Schema: a tiny new `system_prompts` table (or extend an enum) so any prompt across the app reads from one canonical store. Old hardcoded prompts get migrated in-place with a fallback to defaults.

Sidebar: Settings → **Prompt Console** (replaces the standalone "BizzyBot prompts" link; that becomes a section inside).

---

## 6. OCDA Cockpit — a real home for Observations / Choices / Decisions / Actions

You're right that OCDA deserves a dedicated thinking surface, not just a Lens output. New page **`/operate/ocda`** (sidebar group: Operate):

```text
┌───────────────┬───────────────┬───────────────┬───────────────┐
│  Observe      │  Choose       │  Decide       │  Act          │
│  ─────────    │  ─────────    │  ─────────    │  ─────────    │
│  signals,     │  options,     │  logged       │  tasks /      │
│  notes,       │  trade-offs,  │  decisions,   │  workflow     │
│  data points  │  hypotheses   │  rationale    │  runs         │
└───────────────┴───────────────┴───────────────┴───────────────┘
```

- Each column is a Kanban-style stack reading from existing entities filtered by stage:
  - **Observe** ← `proposals` (pending) + `sparks` (system observations) + recent capture inputs + **Signal scanners** results (§7).
  - **Choose** ← items the user has flagged "exploring options" (a small status chip on any record).
  - **Decide** ← `decisions` table (already exists).
  - **Act** ← `tasks` + `workflow_runs` currently in progress.
- **Drag a card across columns** advances its OCDA stage (writes to a new `ocda_stage` column on the underlying record + audit log entry).
- The page itself is driven by an editable **OCDA system prompt** (lives in the Prompt Console) that the AI uses when you click "Suggest next move" on any column.

This makes OCDA navigable, not just talked about.

---

## 7. Signal scanners — fetch the world, propose checklist items per Domain

You asked for "something that reads signals against specific things out in the world… and pulls it back so it can improve a process under one of the domains and add another thing to our checklist."

Build it as a special **Operator subtype**: `kind = 'agent'`, `agent_role = 'signal_scanner'`. Each scanner has:
- A target Domain (or Tenet)
- A query / source list (URLs, search terms)
- A cadence (weekly default, manual "Run now")
- An editable system prompt (in the Prompt Console)

When run, the edge function `scan-signals`:
1. Fetches sources via web search (Lovable AI Gateway w/ browsing).
2. Synthesizes findings against the Domain's current Excellence Rubric checklist.
3. **Proposes new checklist items** as `excellence_checklist_proposals` (status `pending`) with full provenance (source URL, snippet, confidence).
4. They land in the **Capture+Queue** strip (§3) and the Domain detail page's "Pending best-practice updates" section.
5. Human approves → item added to the rubric. Audit-trailed.

This is your "essentially figuring out what is the best practice in every single domain" loop, made real.

---

## 8. Pages-pass — fewer clicks, more clarity (sweep)

A focused list-page pass — same pattern applied across the system:
- Every list page gets: search box · primary filter chips · density toggle (cozy / compact) · saved-views (URL params).
- Every detail page gets: sticky header (title + status + key actions: Edit · Time · Assign · Delete) so primary actions are always one click.
- Replace any "click row → navigate → side panel → back button" with **inline side-sheet preview** (we already have `<Sheet>` from shadcn).
- Empty states get a single "+ New" CTA with the right context, not three buttons.

Targeting (in priority order): Tasks · Projects · Sessions · Engagement Plans · Campaigns · Components · Operators · Documents.

---

## Schema changes

```sql
-- 9th BizzyBot
INSERT INTO lenses (code, name, ...) VALUES ('F9', '<chosen>', ...);

-- OCDA stage on actionable records (additive)
ALTER TABLE tasks       ADD COLUMN ocda_stage text CHECK (ocda_stage IN ('observe','choose','decide','act'));
ALTER TABLE projects    ADD COLUMN ocda_stage text;
ALTER TABLE decisions   ADD COLUMN ocda_stage text DEFAULT 'decide';

-- Master prompts table
CREATE TABLE system_prompts (
  id uuid PK, key text UNIQUE,         -- 'capture.parse', 'queue.tag', 'lens.F1', 'curator.domain', 'ocda.suggest', 'signal.scan'
  name text, description text, scope text,
  system_prompt text, user_prompt_template text,
  model text DEFAULT 'google/gemini-2.5-flash',
  updated_at, updated_by
);

-- Signal scanners + checklist proposals
CREATE TABLE excellence_checklist_proposals (
  id uuid PK, domain_id uuid, tenet_id uuid,
  proposed_text text, source_url text, source_snippet text,
  confidence numeric, status text DEFAULT 'pending',
  scanner_run_id uuid REFERENCES agent_runs,
  created_at, reviewed_by, reviewed_at
);
```

---

## Files

**New:**
- `src/routes/_app.operate.ocda.tsx` · `src/components/ocda-cockpit.tsx`
- `src/routes/_app.settings.prompts.tsx` · `src/components/prompt-editor-sheet.tsx`
- `src/routes/_app.bizzybots.tsx` (Operate → BizzyBots gallery)
- `src/components/lens-tile-grid.tsx` (replaces LensWall on Domain/Tenet pages)
- `src/components/planner-add-popover.tsx` · `src/components/planner-filter-strip.tsx`
- `src/components/calendar-day-sheet.tsx` · `src/components/calendar-zoom-toggle.tsx`
- `src/components/capture-queue-strip.tsx`
- `src/components/signal-scanner-config.tsx`
- `supabase/functions/scan-signals/index.ts`
- Migration `<ts>_ocda_prompts_signals_f9.sql`

**Edited:**
- `src/routes/_app.planner.tsx` — multi-kind, filters, side-sheet preview, capacity bar.
- `src/routes/_app.calendar.tsx` — zoom toggle, day sheet, drag-reschedule, filter strip.
- `src/routes/_app.capture.tsx` — append `<CaptureQueueStrip>`; sidebar label change.
- `src/routes/_app.domains.$slug.tsx` & `_app.tenets.$slug.tsx` — swap LensWall → LensTileGrid.
- `src/components/app-sidebar.tsx` — add **Operate → OCDA Cockpit · BizzyBots**; collapse `/settings/lenses` under Prompt Console.
- `src/routes/_app.settings.lenses.tsx` & `$id.tsx` — keep the per-lens editor; reachable from Prompt Console.

**Memory:**
- `mem://design/lenses-bizzybots.md` — bump to **9 lenses**; add tile-grid render rule.
- `mem://design/sidebar-ia.md` — add **OCDA Cockpit · BizzyBots · Prompt Console**.
- `mem://features/prompt-console.md` — new: every system prompt lives in `system_prompts`, edited in one place.
- `mem://features/signal-scanners.md` — new: scanner agents propose checklist items; human confirms.

---

## One quick clarification before I build

The 9th BizzyBot — what's its code/name/stages? I'll ask you in a tiny picker once you approve the plan. If you don't know yet, I'll seed a placeholder (`F9 — TBD`) you can fill in from the Prompt Console.

## What I'm NOT doing this pass

- Live BizzyBot chat (Phase 3).
- Per-lens fine-tuning UI beyond the prompt textarea.
- Auto-running signal scanners on a schedule (manual "Run now" only until you bless one).
- Mobile gesture refinements on the calendar.

## Suggested order after

1. **2.10o (this plan)** — UX sweep + master prompts + OCDA + signal scanners.
2. **First signal scanner live** on one Domain — watch checklist proposals roll in.
3. **OCDA "Suggest next move"** wired to its system prompt.
4. **Branching workflows / DAG editor.**
