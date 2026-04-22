

# VOC Interview Map — Make it a complete operating doc, not just 5 stage cards

You're right: the current Voice-of-Customer workflow is just 5 step rows with a name and a description. It doesn't tell you **what good looks like**, **what Components it advances**, **what Outcomes it should produce**, or **what artifacts you walk away with**. It reads like a stub, not a playbook.

The schema already supports almost all of this — it's just not surfaced on the workflow detail page or attached to the seed data. Here's the fix.

---

## What "complete" looks like for an Interview Map

Every workflow step should answer five questions at a glance:

1. **What is this stage?** (name + description — already there)
2. **What does good look like?** (success checklist — missing)
3. **What Components does it build/advance?** (link to Components — schema exists, not seeded)
4. **What Outcomes does it serve?** (link to Outcomes/Measures — missing)
5. **What artifacts come out?** (deliverables list — missing)

And the workflow as a whole should answer:

- **Who is this for?** (Session Template link — exists, render it)
- **What Outcomes does the whole workflow drive?** (workflow-level Outcomes — missing)
- **What does the finished engagement produce?** (rolled-up artifact list)

---

## What gets built

### 1. Schema additions (1 migration)

```
workflow_steps  (add columns)
  success_criteria        text[]      -- "what good looks like" checklist
  deliverables            text[]      -- artifacts produced by this step
  estimated_duration_min  int         -- how long the step takes

workflow_step_components  (new table — link steps to components they advance)
  workflow_step_id, component_id, contribution_type

workflow_step_outcomes    (new table — link steps to outcomes they serve)
  workflow_step_id, outcome_id

workflow_outcomes         (new table — workflow-level outcome links)
  workflow_id, outcome_id
```

`workflow_steps.required_role` and `awaiting_approval` already exist — keep using them.

### 2. Seed the VOC workflow properly

Update each of the 5 steps (Seed/Synthesize/Session/Sync/Ship) with:

- **Success criteria checklist** (3–5 items per stage, e.g. for *Seed*: "Stakeholder has completed pre-interview form", "All 22 domains assigned a confidence rating", "Top 3 friction points named")
- **Deliverables** (e.g. *Synthesize* → "Tension map", "Hypothesis list", "Question bank")
- **Component links** — connect steps to the Components they advance (Discovery / Voice of Customer / Insight Capture / Strategic Synthesis from your existing 72 user components)
- **Estimated duration** per step
- **Workflow-level Outcomes** — link the whole VOC workflow to the appropriate outcomes (e.g. "Decision-grade clarity on what to build next")

### 3. Rewrite the workflow step UI

**`workflow-step-canvas.tsx`** and **`workflow-step-sheet.tsx`** get a richer card per step:

```
┌─ Stage 2: Synthesize ────────────────────── ~90 min ─┐
│ Turn raw signals into structured tension and        │
│ hypothesis ready for the live session.              │
│                                                      │
│ ✓ What good looks like                              │
│   ☐ Tension map drafted with ≥3 named tensions      │
│   ☐ 5–8 hypotheses ranked by confidence             │
│   ☐ Open questions flagged for the session          │
│                                                      │
│ 🧩 Builds these Components                          │
│   • Strategic Synthesis  • Insight Capture          │
│                                                      │
│ 🎯 Serves these Outcomes                            │
│   • Decision-grade clarity on next bet              │
│                                                      │
│ 📦 Deliverables                                     │
│   Tension map · Hypothesis list · Question bank     │
└─────────────────────────────────────────────────────┘
```

### 4. Workflow detail page header

Add a top panel on `/workflows/$id` showing:

- Linked Session Template (already wired — render it)
- **Workflow Outcomes** (new — what the whole arc serves)
- **Components advanced** (rolled up from all steps)
- **Total estimated duration** (summed from steps)

### 5. Make this the canonical pattern

Once VOC is the model, the same structure applies to every workflow. Update the workflow editor sheet so authoring a new workflow prompts for: success criteria per step, deliverables per step, and workflow-level Outcomes.

Memory rule added: *"Every workflow step carries success_criteria + deliverables + component links + outcome links. Workflows roll up step links to a workflow-level view."*

---

## What this is NOT

- Not changing the existing 5-stage names — Seed/Synthesize/Session/Sync/Ship stays
- Not adding new tables when columns suffice (`success_criteria` and `deliverables` are arrays on the existing table)
- Not deferring SparkPath Phase B/C, Sparks-Library curation UI, or `/sparks` & `/components/$id` wiring — those resume after this
- Not touching workflow runs / workflow_step_runs (the *execution* side stays as-is)

---

## Order of operations (one pass)

1. **1 schema migration** — 3 columns on `workflow_steps` + 3 link tables + RLS
2. **1 data migration** — fully populate the VOC workflow's 5 steps with success criteria, deliverables, component links, outcome links, durations
3. **2 file edits** — `src/components/workflow-step-canvas.tsx` (new card layout), `src/components/workflow-step-sheet.tsx` (edit fields for the new attributes)
4. **1 file edit** — `src/routes/_app.workflows.$id.tsx` (header panel with workflow-level rollup)
5. **1 memory file** `mem://features/workflow-completeness.md` + index entry

After this lands, the VOC interview map will read as a complete operating doc — every stage shows what good looks like, what it builds, what it serves, and what it produces.

