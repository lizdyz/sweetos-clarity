

# Phase 2.7: Decouple tenets, model excellence as L1–L5 × 5Ps, auto-tag at capture

You're naming three real gaps. Let me address each, then the build.

## What you said, restated

1. **Domains ≠ Tenets.** Domains are universal across all businesses (D1–D22). Tenets are **niche-dependent** (per industry). They are independent taxonomies. Today the schema already treats them as independent string arrays — good — but the UI (and the seeded tenets from the FA list) blurs them. We need to make tenets **industry-scoped** and stop treating the seeded 22 as universal.

2. **Excellence is a matrix, not a label.** For Domains, Tenets, and Components, "excellence" is defined as **what each looks like at L1 Lacking → L2 Learning → L3 Launching → L4 Leveraging → L5 Leading**, and each is interrogated through the **5 Ps** (the lenses that produce the checklist of what to know). Today `rubric_items` is a flat list per tenet — too thin. It needs to be a **5L × 5P grid** anchored to a Domain / Tenet / Component.

3. **Capture should not make me tag.** Right now `/capture` makes you pick Domains, Tenets, Components manually. That's wrong. The AI should **read the message + files and propose the tags** as part of the proposal. You confirm or edit them in the Queue, not at capture time.

## Build

### 1. Schema: industry-scoped tenets + excellence rubric

**Migration A — `industries` + scope tenets**
- New table `industries` (`id, name, slug, sort_order, enabled`). Seed: Financial Advisory, Legal, Accounting, Coaching, Consulting, Other (editable in Settings later).
- Add `tenets.industry_id uuid` (nullable = universal). Backfill: the 22 seeded FA tenets get `industry_id = Financial Advisory`. Existing `tenets.category` stays (Foundation/Specialization/Advanced/Mastery).
- Add `relationships.industry_id uuid` so a relationship's domain dashboard can filter to its industry's tenets. Migrate the existing free-text `relationships.industry` value into `industry_id` via a best-effort match, keep the text column as fallback.
- Drop the universal-tenet UX assumption from the Domain pages and tag pickers. Tenet picker becomes industry-aware.

**Migration B — Excellence Rubric (5L × 5P)**

New tables that replace the thin `rubric_items` model:

- `excellence_perspectives` — seeded with the 5 Ps (P1 Purpose, P2 People, P3 Process, P4 Performance, P5 Progress — confirm naming with you in Settings; placeholder until you correct).
- `maturity_levels` — seeded with L1 Lacking, L2 Learning, L3 Launching, L4 Leveraging, L5 Leading (already an enum; keep enum, mirror as a lookup table for joins).
- `excellence_rubric` (the matrix row):
  - `id`
  - `subject_kind` enum (`domain` | `tenet` | `component`)
  - `subject_id uuid` (FK by kind, soft)
  - `level maturity_level` (L1–L5)
  - `perspective_id uuid` → `excellence_perspectives`
  - `excellence_definition text` ("what excellent looks like at this level through this lens")
  - `checklist_items text[]` ("what to know" — the questions/criteria from this 5P lens)
  - `enabled boolean`
- `excellence_scores` (per relationship per rubric row): `relationship_id, rubric_id, met boolean, notes, assessed_by, assessed_at`. Sums up per subject to derive current maturity.

`rubric_items` / `rubric_scores` are deprecated but kept (no drop) so existing code keeps compiling; new UI reads the new tables.

### 2. AI auto-tagging at capture (the big UX fix)

**Capture page (`/capture`)**
- **Remove** the three tag pickers from the form. The user just types/talks/drops files.
- The form shows a passive hint: "Tags will be inferred — review them in the queue."

**Server function (`captureProposal`)**
- After AI normalizes the proposal, run a second pass: feed the AI (a) the canonical Domain list (22), (b) the Tenets relevant to the inferred industry (or all if unknown), (c) a short list of recent Components, and ask it to **return** `{ tagged_domains[], tagged_tenets[], tagged_components[], confidence_per_tag }`.
- Persist these on the proposal as suggestions. Lower-confidence tags marked `suggested` vs `confident`.

**Queue page (`/queue`)**
- Each proposal card shows the **AI-suggested tags as removable chips** plus an "+ add tag" affordance. User confirms / edits / adds.
- Approve copies the final tag set to the written entity (already wired).
- Bulk action: "Accept all suggestions" per card.

### 3. Domain & Tenet & Component pages — show the excellence checklist

- `/domains/$slug`: show the **5L × 5P matrix** for that domain. Each cell shows the excellence definition + checklist. With a relationship selected, cells flip to show **score state** (met / partial / not met) and the rolled-up current maturity level.
- New `/tenets/$slug` (mirrors domain page) — shows the matrix scoped to the tenet, filtered by the active relationship's industry.
- `/components/$id` already exists; add the same matrix tab.
- "What to assess next" recommendation: the lowest-scoring 5P lens at the relationship's current level.

### 4. Settings: Excellence editor

- New `/settings/excellence` route: edit Domains, Industries, Tenets (per industry), and Excellence Rubric cells (5L × 5P × subject). Bulk-paste support for the checklist items.
- Seed with empty cells; you fill in the canon. AI can also **draft** rubric content from a single sentence per subject, queued as proposals (so the same approval loop applies).

### 5. Sidebar tweak

Add **Industries** under the operate group (small), so the industry list is explicit and editable. Tenets become reachable under each industry rather than globally.

## Data flow after the change

```text
Capture (text + files, no manual tags)
        │
        ▼
captureProposal  ── AI pass 1: entity_type + fields
                 ── AI pass 2: suggest tags from canon
        │
        ▼
Proposal (with suggested tag chips + attachments)
        │
        ▼
Queue: review → confirm/edit tags → approve
        │
        ▼
Entity row written, tags + attachments propagated
        │
        ▼
Domain / Tenet / Component pages show 5L × 5P matrix
with scored state per relationship
```

## Files touched

**Migrations**
- `<ts>_phase2.7_industries_scoped_tenets.sql` — `industries`, `tenets.industry_id`, `relationships.industry_id`, backfill
- `<ts>_phase2.7_excellence_rubric.sql` — `excellence_perspectives`, `maturity_levels` lookup, `excellence_rubric`, `excellence_scores`, RLS

**Server**
- `src/utils/proposals.functions.ts` — second AI pass for tag suggestion, persist suggested tags + per-tag confidence
- `src/utils/excellence.functions.ts` (new) — read/write rubric, compute current maturity per subject per relationship

**UI**
- `src/routes/_app.capture.tsx` — drop tag pickers, keep file drop, add inference hint
- `src/routes/_app.queue.tsx` — render AI-suggested tag chips with confirm/edit/add
- `src/routes/_app.domains.$slug.tsx` — replace flat rubric with 5L × 5P matrix, scored
- `src/routes/_app.tenets.$slug.tsx` (new) — same matrix, scoped per industry
- `src/routes/_app.components.$id.tsx` — add Excellence tab with the matrix
- `src/routes/_app.settings.excellence.tsx` (new) — editor for industries, tenets, rubric cells
- `src/components/excellence-matrix.tsx` (new) — reusable 5L × 5P grid
- `src/components/tag-picker.tsx` — make Tenet picker industry-aware (used in Queue, not Capture)
- `src/components/app-sidebar.tsx` — add Industries; nest Tenets under industry context

## What I'm NOT changing

- Domains canon (22) stays as-is.
- The seeded 22 FA tenets stay — they're just re-scoped to `industry = Financial Advisory` instead of universal.
- Existing `tagged_*` array columns stay — they're the persistence shape; only how we *populate* them changes.
- Workflows, Kanban, Capture file uploads, Queue attachment handling — untouched.

## One quick decision before I build

**The 5 Ps:** I'm using placeholder names (Purpose, People, Process, Performance, Progress) so the schema lands. Confirm or replace with your canonical 5 Ps so I seed `excellence_perspectives` correctly in the same migration. If you want me to leave them as placeholders and you'll edit in `/settings/excellence`, say "placeholder is fine."

