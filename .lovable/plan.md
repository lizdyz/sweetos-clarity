

# Wave 12 — Make Capture truly pollinate everything (and make the Prompt Console honest)

You're flagging two things that are actually the same root cause:

1. **The Prompt Console only lists 2 prompts under "Capture & Queue"** because that's all that exists — `capture.parse` and `capture.parse.jtbd`. But more importantly: **none of those prompts are even being used.** `proposals.functions.ts` has the prompts hardcoded inline. Editing them in `/settings/prompts` does nothing. That's the dishonesty.
2. **Capture today only matches against ~18 entity types** (persona, relationship, project, task, etc.) and only suggests Domain/Tenet/Component tags. It doesn't search the rich layer — JTBDs, Sparks, Quests, KTIs, Outcomes, Decisions, Sandbox items — so it can't *pollinate*. A capture about "client keeps asking how to price retainers" should also suggest: "this matches JTBD #X for persona Y, KTI #Z is watching for this, attach to Quest Q."

Here's the fix.

## Part A — Make the Prompt Console real

**Problem:** the Console reads from `system_prompts` but the actual capture pipeline ignores that table.

**Fix:** rewrite the capture pipeline to load every prompt from `system_prompts` by `key`, with the inline string only as fallback if a row is missing. One small loader: `getPrompt(key, fallback)`. Every AI call in `proposals.functions.ts`, `workflows.functions.ts`, and the four edge functions uses it.

After this, edits in `/settings/prompts` actually change behavior.

## Part B — Capture pollinates the whole system (the part you're really asking for)

Today's capture pipeline:

```text
text ──▶ [normalize: pick 1 of 18 entities] ──▶ [tag: domains/tenets/components]
```

What it should be:

```text
text ──▶ [classify intent] ──▶ [normalize entity] ──▶ [pollinate: search ALL relevant libraries]
                                                       ├─ JTBDs (by persona/role/job-shape match)
                                                       ├─ Personas (whose role matches)
                                                       ├─ Open Quests / Sparks (active triage)
                                                       ├─ KTIs (anything watching for this pattern?)
                                                       ├─ Outcomes/Decisions in flight
                                                       ├─ Components that address this
                                                       └─ Domains/Tenets (already done)
                                                       │
                                                       ▼
                                           Single proposal carrying ALL related-record IDs
                                           that the user can confirm/reject in Queue
```

### The new prompt set under "Capture & Queue"

The Prompt Console section grows from 2 prompts to a coherent set:

| key | role |
|---|---|
| `capture.intent` | classify *what kind of input this is*: observation · jtbd · task · question · trend signal · client update · idea |
| `capture.parse` (existing, honored) | pick the single best entity type + extract fields |
| `capture.parse.jtbd` (existing) | when intent=jtbd, extract the full JTBD shape |
| **`capture.match.persona`** (new) | given input + persona library, pick which personas this lights up |
| **`capture.match.jtbd`** (new) | given input + JTBD library scoped to matched personas, pick relevant jobs |
| **`capture.match.quest_spark`** (new) | given input + open Quests/Sparks, pick which to attach |
| **`capture.match.kti`** (new) | given input + active KTIs, flag any whose patterns just got evidence |
| **`capture.suggest.kti`** (new — Wave 11 follow-through) | propose a *new* KTI when input looks like a recurring trend signal |
| `queue.tag` (existing) | domain/tenet/component tagging (stays as final pass) |

Each is one row in `system_prompts`, editable from the Console, used by the pipeline.

### Persona-aware library spawning (your specific question)

> "How do we spawn the libraries that are relevant depending on the persona?"

The match passes are **scoped, not global**:

1. `capture.match.persona` runs first against the small persona table (~6 rows now, capped at top-N by relevance).
2. Once we have matched persona IDs, **only the JTBDs belonging to those personas** are sent to `capture.match.jtbd`. So if input mentions "advisor onboarding," and that lights up the "Wealth Advisor" persona, the JTBD library passed to the next pass is *just* that persona's jobs — not all 8 globally. Token-cheap and accurate.
3. Same scoping for Quests/Sparks (filtered by `relationship_id` if one was matched in the normalize step).

This is the canonical "JTBD = the role's standard jobs; campaigns/projects/tasks = work instances against those jobs" model from your memory. The pipeline now respects it: capture finds the persona → loads that persona's JTBDs → links the new task/project/campaign to the matched JTBD.

### What lands on the proposal row (DB)

Add these columns to `proposals` (one migration, additive, all nullable):

| column | type | purpose |
|---|---|---|
| `intent` | text | from `capture.intent` |
| `matched_personas` | uuid[] | from `capture.match.persona` |
| `matched_jtbds` | uuid[] | from `capture.match.jtbd` |
| `matched_quests` | uuid[] | from `capture.match.quest_spark` |
| `matched_sparks` | uuid[] | same |
| `matched_ktis` | uuid[] | from `capture.match.kti` |
| `suggested_kti_payload` | jsonb | *(already added Wave 11 on `inbound_signals`; mirror here)* |

When a proposal is approved into a Task/Project/Campaign, those `matched_jtbds` are written to the new entity's `jtbd_ids` link (see Part C).

### Queue UI = what gets confirmed

In `/capture` the proposal card already shows entity type, fields, suggested tags. Add three new chip rows below:

```text
👤 Personas this touches:   [Wealth Advisor]  [Compliance Officer]
🎯 JTBDs this advances:     [Onboard new client smoothly]  [+ create]
🔭 Watch matches:           [KTI: rising churn — fired]
🧭 Active work:             [Quest: Q1 Mirror]  [Spark #142]
```

Each chip is editable (add/remove) before approve. Approve writes the links.

## Part C — JTBD ↔ work-instance plumbing

You said it cleanly: **JTBDs are the role's standard jobs; Campaigns/Projects/Tasks are the work instances that advance them.** Today there's no link. Add:

| join table | purpose |
|---|---|
| `task_jtbds (task_id, jtbd_id)` | which JTBDs a task advances |
| `project_jtbds (project_id, jtbd_id)` | same for projects |
| `campaign_jtbds (campaign_id, jtbd_id)` | same for campaigns |

Surface on detail pages via a small `<JTBDChips>` component, and on JTBD detail show "Work in flight against this JTBD" (rollup view `jtbd_work_pipeline`).

## Files

**New backend:**
- One migration: add proposal columns + 3 join tables + `jtbd_work_pipeline` view
- `src/lib/get-prompt.ts` — single loader: `getPrompt(key, { fallbackSystem, fallbackUser, fallbackModel })`

**Edited backend:**
- `src/utils/proposals.functions.ts` — break the monolithic normalizer into a 4-stage pipeline (intent → normalize → match-personas → match-jtbds/quests/ktis → tag); every stage uses `getPrompt`
- `src/utils/workflows.functions.ts` + 4 edge functions — switch their inline prompts to `getPrompt`

**New frontend:**
- `src/components/jtbd-chips.tsx` — read/edit JTBD links on Tasks/Projects/Campaigns
- `src/components/capture-pollination-chips.tsx` — the persona/JTBD/KTI/Quest chip row on proposal cards

**Edited frontend:**
- `src/routes/_app.capture.tsx` — render the new chip rows; allow edit before approve
- `src/routes/_app.tasks.$id.tsx` · `_app.projects.$id.tsx` · `_app.campaigns.$id.tsx` — mount `<JTBDChips>`
- `src/routes/_app.library.jtbd.$id.tsx` — add "Work in flight" panel reading `jtbd_work_pipeline`

**New seed rows in `system_prompts`** (one SQL insert in the migration):
- `capture.intent` · `capture.match.persona` · `capture.match.jtbd` · `capture.match.quest_spark` · `capture.match.kti` · `capture.suggest.kti`

**Memory:**
- `mem://design/capture-pollination.md` — codify the four-pass capture pipeline + persona-scoped JTBD loading rule

## Sequencing

1. Migration + `getPrompt` loader (~15%)
2. Switch existing 10 prompts to load via loader (~10%)
3. Seed the 6 new prompt rows + new pipeline passes in `proposals.functions.ts` (~30%)
4. Capture UI chip rows + edit-before-approve (~20%)
5. JTBD link tables + `<JTBDChips>` mounts on Task/Project/Campaign detail (~15%)
6. JTBD detail "Work in flight" panel + memory doc (~10%)

## Not in this wave

- No sidebar changes
- No new top-level routes
- No changes to the persona R1 enforcement decision (still `jtbd_id` nullable)
- No edits to auto-generated files
- The KTI suggestion-from-capture chip from Wave 11 piggybacks on this same pipeline (the missing Wave-11 piece gets shipped here cleanly)

After Wave 12: Capture lights up everything it should (personas, JTBDs, KTIs, quests, sparks, components, domains, tenets) — scoped intelligently by persona — and the Prompt Console actually controls the prompts that run. Every "+ New" of a Task/Project/Campaign carries the JTBDs it advances. The Console section count under Capture & Queue grows from 2 to 8, all editable, all live.

Reply **"Run Wave 12"** to ship in this order, or **"Just the prompt-loader + new prompts first"** to land the honesty fix before the pollination passes.

