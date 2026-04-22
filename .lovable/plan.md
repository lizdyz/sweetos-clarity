

# Tasks as a workbench, SweetScan as world-watch + auto-spawn, Decision Factory as the OCDA upgrade

Three interconnected fixes. Together they close a loop that's currently broken: **signals come in → nothing happens to them → tasks pile up disconnected from why they exist**. After this lands, every task knows what spawned it, every fire produces an option, and every client has their own outside-in view.

I'll plan for the most likely meaning of "Decision Factory" since "see below" wasn't included — flagged so you can redirect me.

---

## Part A — Tasks as a workbench (not a list)

You named four pains. Each maps to a build:

### A1. "Disconnected from the rest of the OS" → Provenance + downstream chips on every row

Every task already *can* link to a project, relationship, quest, KTI, decision — we just don't show it. Add a **provenance strip** to each task row and a **downstream strip**:

- **Spawned by** chip: KTI fire · Spark · Decision · Capture proposal · Workflow step · Manual
- **Part of** chip: Mission · Quest · Project · Component build · Session
- **Blocks** chip: "Blocks N other tasks" (already in `task_blockers` view, just not surfaced on the index)

Three small chips, max one row of vertical space, but every task instantly answers "why does this exist and what depends on it?"

### A2. "It's just a list — should feel like a workbench" → Inline edit + drag-to-status board view

Two new modes alongside today's grouped list:
- **Board view** — Kanban over status (using existing `<StageSwimlanes>` and `useDragToStatus` per canon). Drag = update.
- **Inline quick-edit** on every row: status (chip click → cycle), due date (chip click → popover), operator (chip click → picker). No drawer needed for trivial changes.

Plus a **batch action bar** when ≥2 tasks selected: bulk reassign, bulk reschedule, bulk close.

### A3. "No sense of what should I do next?" → Smart "Next up" lane

A new top section above the grouped list — composed, not a new table:
1. **Unblocked & due today** (green dot)
2. **Unblocked & spawned by a fired KTI** (orange dot — high signal)
3. **Unblocking the most other work** (purple dot — leverage)
4. **Started but stalled ≥3 days** (amber dot — close the loop)

Capped at 8 items. This is the answer to "what now?"

### A4. "Capture → Task pipeline is unclear" → Pipeline ribbon

Tiny ribbon under the page header showing a 4-step funnel with live counts:

```text
Capture (12) → Queue (4) → Tasks (open: 38, blocked: 6) → Done this week (11)
```

Each segment is a link. From any task you can see "this came from Capture row #X on April 18" via the spawned-by chip → Capture detail.

### A5. Memory
- New `mem://design/tasks-as-workbench.md` — provenance/downstream/next-up rules; board+list parity

---

## Part B — SweetScan: per-relationship world-watch + auto-spawn + inbound capture

You picked all three of these. They compose into one upgraded SweetScan.

### B1. Per-relationship "World Watch" (the missing client view)

New tab inside `/sweetscan` AND a new section on every Relationship detail page: **World Watch**.

Per relationship, surfaces:
- **Industry pulse** — KTIs scoped to this client's industry/tenets, plus their universal KTIs that fired
- **Competitor & market** — saved sources (URLs the user adds per client) that get rescanned on cadence; new mentions surface as cards
- **Their domains in motion** — for the Domains this client cares about, latest external best-practice signals from the rubric scanner
- **Inbox for this client** — anything captured (article, podcast, transcript) that AI tagged to this relationship

This becomes part of the **portal recap** later — but lives internal-only for now.

### B2. Auto-spawn from KTI fires (the missing action)

Today, when a KTI fires it sets `status='fired'` and shows up in `<FiredKtisStrip>` — that's it. New behavior, driven by the existing `trigger_action` enum on `key_trend_indicators`:

| `trigger_action` | What now happens automatically |
|---|---|
| `task` | Insert a Task with `name = "KTI fired: {kti.name}"`, `relationship_id`, provenance `spawned_by_kti_id`, status `Not Started`, due in 3 days |
| `bot_alert` | Push a row into a new `bot_alerts` table; surfaces in topbar bell |
| `flightdeck_flag` | Set a flag on the relationship visible in Flightdeck row |
| `all` | All three above |

Implementation: extend `trg_kti_scan_fired` to dispatch on `trigger_action`, OR move the dispatch into the `scan-signals` edge function (cleaner — easier to template the Task name + add a draft Decision option later).

Adds two columns to `tasks`: `spawned_by_kind` (enum: `kti`, `spark`, `decision`, `capture`, `workflow`, `manual`) and `spawned_by_id` (uuid). These power the provenance chip in Part A1.

### B3. Inbound Capture pipeline → SweetScan signal inbox

Today, Capture exists but its outputs don't reach SweetScan. New flow:

1. User drops an article URL / podcast link / transcript / screenshot into Capture (works today)
2. New step: AI classifies inbound captures with **what kind of intelligence** this is — domain best-practice / KTI evidence / competitor move / client-specific signal — and **who it's about** (domain · relationship · KTI)
3. Tagged signal lands in **SweetScan → Signal Inbox** (existing tab, expanded) AND fires any KTI it matches
4. From the inbox: one-click "Convert to Spark" / "Convert to Task" / "Attach as evidence to Decision"

New table: `inbound_signals` (id, source_kind enum: url/podcast/transcript/screenshot/text, source_url, raw_payload jsonb, classified_kind, classified_subject_type, classified_subject_id, confidence, status enum: pending/routed/dismissed, created_at). RLS by team membership.

Reuses `scan-signals` edge function with new `mode: 'classify_inbound'`.

### B4. Memory
- Update `mem://design/sweetscan-as-eyes-and-ears.md` — add World Watch, Auto-spawn, Inbound Capture; clarify SweetScan home stays `/sweetscan` but it now has hands, not just eyes

---

## Part C — "Decision Factory" (BEST GUESS — please correct me before build)

I have **zero references** to "Decision Factory" anywhere — not in chat history, codebase, saved docs (Master Guide v4, Blue Notebook), or memory. Your message said "see below" but nothing followed. My best guess based on the OS shape:

**Hypothesis:** Decision Factory = the upgrade to OCDA Cockpit that turns it from a 4-column observatory into an actual *factory* — inputs come in one end, decisions ship out the other, with framed options in between. Today's `/operate/ocda` is a passive read view; you want it to be a producer.

### C1. New shape

Replace the 4-column read-only OCDA cockpit with a **5-stage factory pipeline**:

```text
INPUTS → FRAME → OPTIONS → DECIDE → DISPATCH
  │        │        │         │         │
signals  open    weighted   logged   tasks/wflows
sparks   ?'s     options   decision  spawned
fires    posed   w/ canon  rationale w/ provenance
captures
```

Each stage is a vertical lane with cards. Cards **flow forward** with a click — not just appear in different lists.

- **INPUTS lane** — every fired KTI, every pending capture proposal, every "open question" tagged in a session, every spark flagged for decision
- **FRAME lane** — click an input → drawer asks: "What's the actual question?" Saves a `framed_question` row with `source_kind/source_id`
- **OPTIONS lane** — click a frame → AI (using BizzyBot Lenses) generates 2–4 options with: pros, cons, canon precedent (which past Decision is similar), confidence
- **DECIDE lane** — click an option → "Decide" drawer: rationale, supersedes, attach evidence (which inputs informed this), confidence level (Inferred/Observed/Verified per Master Guide v4). Writes a `decisions` row.
- **DISPATCH lane** — every new decision auto-shows here with "Spawn task" / "Spawn workflow" / "Update component canon" action buttons. Spawned tasks carry `spawned_by_decision_id`.

### C2. New tables

- `framed_questions` (id, source_kind, source_id, question, framed_by, created_at, status)
- `decision_options` (id, framed_question_id, label, pros, cons, precedent_decision_id, generated_by enum: human/ai, ai_lens_code, confidence, created_at)
- Extend `decisions`: `framed_question_id`, `chosen_option_id`, `evidence_input_ids jsonb`, `confidence_level` enum

### C3. Surfaces
- `/operate/decision-factory` — new route (replaces or sits next to `/operate/ocda`)
- Today: replace today's tiny `<DecisionQueueWidget>` with a "Factory backlog" tile (count of unframed inputs)
- Sidebar: rename "Deliver → OCDA Cockpit" to "Deliver → Decision Factory"
- Decision detail page: add "Framed from {question}" + "Chose {option} over {N} alternatives" header

### C4. Memory
- New `mem://design/decision-factory.md` — pipeline shape, lane semantics, OCDA→Factory rename

### **I will NOT build Part C without your confirmation that this matches what you mean.** If "Decision Factory" is something else entirely, tell me and I'll re-plan just this part.

---

## Files this plan touches

**Tasks workbench (Part A) — 4 files + 1 migration**
- `supabase/migrations/<ts>_task_provenance.sql` — add `spawned_by_kind`, `spawned_by_id` columns
- `src/routes/_app.tasks.index.tsx` — add Next-up lane, pipeline ribbon, board mode toggle, batch bar
- `src/components/tasks-board.tsx` (new) — drag-to-status using `<StageSwimlanes>` + `useDragToStatus`
- `src/components/task-row.tsx` (new) — extracted row with provenance/downstream chips, inline edit
- `src/components/tasks-pipeline-ribbon.tsx` (new) — Capture→Queue→Tasks→Done counts

**SweetScan upgrade (Part B) — 7 files + 1 migration + edge function**
- `supabase/migrations/<ts>_inbound_signals.sql` — `inbound_signals` table + RLS, `bot_alerts` table
- `supabase/functions/scan-signals/index.ts` — add `mode: 'classify_inbound'` + dispatch on `trigger_action`
- `src/routes/_app.sweetscan.tsx` — add World Watch tab, expand Signal Inbox to include inbound
- `src/routes/_app.relationships.$id.tsx` — embed `<WorldWatchPanel relationshipId={id} />`
- `src/components/world-watch-panel.tsx` (new)
- `src/components/inbound-signal-card.tsx` (new) — "Convert to Spark / Task / Decision evidence"
- `src/routes/_app.capture.tsx` — wire confirmed captures to `inbound_signals` insert
- `src/components/app-topbar.tsx` — add bell icon for `bot_alerts`

**Decision Factory (Part C) — 5 files + 1 migration (PENDING YOUR CONFIRMATION)**
- `supabase/migrations/<ts>_decision_factory.sql` — `framed_questions`, `decision_options`, extend `decisions`
- `src/routes/_app.operate.decision-factory.tsx` (new)
- `src/components/decision-factory.tsx` (new) — 5-lane pipeline component
- `src/routes/_app.operate.ocda.tsx` — redirect to factory OR keep as legacy view
- `src/components/sidebar-nav.tsx` — rename + reroute

**Memory (5 files):**
- `mem://design/tasks-as-workbench.md` (new)
- `mem://design/sweetscan-as-eyes-and-ears.md` (update — World Watch, Auto-spawn, Inbound)
- `mem://design/decision-factory.md` (new — pending confirmation)
- `mem://features/ktis.md` (update — add `trigger_action` dispatch behavior)
- `mem://index.md` (update Core: "Every task carries provenance — spawned_by_kind + spawned_by_id"; "SweetScan has hands: fires spawn tasks, captures route to inbox")

---

## What this plan is NOT

- Not removing or renaming any sidebar group
- Not building the client portal recap from World Watch (separate plan when ready)
- Not reworking Capture's UI — only its outflow into `inbound_signals`
- Not auto-deciding anything — Decision Factory still requires a human at the Decide gate
- **Not building Decision Factory until you confirm or correct my interpretation**

---

## After this lands

A task on `/tasks` will tell you why it exists ("Spawned by KTI fire on April 21"), what it's part of ("Quest: Q3 retention"), and what it unblocks ("Blocks 3 tasks"). You can drag it across statuses, edit its date inline, and the page tells you what to do next. SweetScan will be your eyes-AND-hands per client — fires spawn tasks, podcasts you drop become signals routed to the right Domain, every relationship has its own world-watch view. Decision Factory (if confirmed) will be the place where signals turn into framed questions turn into options turn into logged, dispatched decisions — with full provenance back through the chain.

Reply with one of:
- **"Run A + B, hold on C until I clarify"** — safest; ships Tasks workbench + SweetScan upgrade, you tell me what Decision Factory really is, then I plan C separately
- **"Run all three, my Decision Factory matches"** — ships everything as described
- **"Decision Factory is actually X"** — describe it, I re-plan Part C only

