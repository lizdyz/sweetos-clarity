

# Wave 7 — Universal drop-zone + standardized triage on every object

You've named the real problem: every entity (Capture, Sandbox, Sparks, KTIs, Inbound signals, Decisions, Tasks) has its own bespoke "intake + triage + promote" UI. So dropping a link/doc/note into Sandbox feels different from dropping one into Capture, and routing an idea into OCDA feels different from routing it into Decisions. **The fix is one shared shape + one shared UI, mounted everywhere.**

You already have the seed for this — `src/lib/triageable.ts` and `<TriageCard>`/`<FrameworksRail>` exist per `mem://design/triageable-interface.md`. Wave 7 finishes that promise and adds the universal drop zone you're asking for.

## Three moves, one wave

### 1. Universal `<UniversalDropZone />` — drop anything, anywhere

A single component that accepts:
- **Files** (PDFs, images, audio, video → uploaded to storage, becomes a `document`)
- **Links** (URL pasted → fetched + titled, becomes an `inbound_signal` with `kind='link'`)
- **Text** (typed/pasted prose → becomes a `capture` row)
- **Existing entity** (drag a Spark/Task/Decision card in → creates a new sandbox item linked to it as upstream provenance)

One component, four input modes, one output: a `sandbox_items` row in `state='raw'` ready for triage. Mounts on `/sandbox`, `/today`, `/capture`, and floats as a global "+" button in the topbar so you can drop from anywhere.

### 2. Standardized `<TriageCard>` + `<FrameworksRail>` rollout — finish the promise

The interface exists; the rollout doesn't. Wave 7 mounts the shared triage UI on every triageable surface so the gesture **select → overlay → frame → promote** is identical everywhere:

| Surface | What it gets |
|---|---|
| `/sandbox` | Already has it (keep) |
| `/sparks` index | Replace bespoke cards with `<TriageCard>` |
| `/decisions` index | Add `<TriageCard>` for `state='proposed'` |
| `/capture` queue | Replace bespoke triage row with `<TriageCard>` |
| `/sweetscan` inbox | Replace `<InboundSignalCard>` with `<TriageCard>` |
| `/operate/ocda` Observe lane | Mount `<TriageCard>` so signals route into Choose with one click |
| Task detail · Decision detail · Spark detail | Mount `<FrameworksRail>` in the right rail |

Same six promote verbs everywhere: **→ Task · → Project · → Spark · → Decision input · → Component canon · → Archive**. The "where does this go?" question gets answered the same way no matter what page you're on.

### 3. `<UniversalFilterBar />` — filter any list the same way

Today every index page has a different filter strip. Wave 7 introduces one component that handles the four filters that matter on **every** entity list:

```text
[ Domain ▾ ] [ Tenet ▾ ] [ 5 P ▾ ] [ Lens F1–F8 ▾ ] [ State ▾ ] [ Owner ▾ ]
                                                     ↑ regroups via FrameworkLensSwitcher
```

Plus a `?` chip that opens a one-line legend explaining what each filter does in your canon vocabulary. Mounts on: `/sandbox`, `/sparks`, `/decisions`, `/tasks`, `/components`, `/quests`, `/today`, `/capture`, `/sweetscan`, `/projects`, `/sessions`. URL-state via TanStack search params (zod adapter + `fallback()`) so filter state is shareable and survives refresh.

## So — is the lack of standardization the real problem?

**Yes.** You correctly diagnosed it. Wave 6 reconciled the **data model** (8 issues closed). Wave 7 reconciles the **interaction model** so working with a Spark feels the same as working with a Decision feels the same as working with a Task. That's what makes "I should be able to move things around" actually true.

## Files I'll touch

**New components:**
- `src/components/universal-drop-zone.tsx` — files/links/text/entity-drag → `sandbox_items`
- `src/components/global-add-button.tsx` — topbar "+" that opens drop zone in a popover
- `src/components/universal-filter-bar.tsx` — Domain/Tenet/5P/Lens/State/Owner with URL state
- `src/lib/use-universal-filters.ts` — TanStack search-params hook (zod + fallback)
- `src/lib/triage-promote.ts` — shared promote actions (Task/Project/Spark/Decision/Component/Archive) so every `<TriageCard>` writes provenance the same way

**Edited (mounts only — no rewrites):**
- `src/components/app-topbar.tsx` — add `<GlobalAddButton />`
- `src/routes/_app.sandbox.tsx` — add `<UniversalDropZone />` + `<UniversalFilterBar />`
- `src/routes/_app.capture.tsx` — replace bespoke triage with `<TriageCard>` rows + drop zone
- `src/routes/_app.sweetscan.tsx` — `<TriageCard>` on inbound signals
- `src/routes/_app.sparks.index.tsx` — `<TriageCard>` + `<UniversalFilterBar />`
- `src/routes/_app.decisions.index.tsx` — same
- `src/routes/_app.tasks.index.tsx` — `<UniversalFilterBar />`
- `src/routes/_app.components.index.tsx` — same
- `src/routes/_app.quests.index.tsx` — same
- `src/routes/_app.today.tsx` — `<UniversalDropZone />` collapsed at top + filter bar on the lists
- `src/routes/_app.operate.ocda.tsx` — `<TriageCard>` in Observe lane
- `src/routes/_app.tasks.$id.tsx`, `_app.decisions.$id.tsx`, `_app.sparks.$id.tsx` — mount `<FrameworksRail>` in right rail

**Migrations (small):**
- `sandbox_items.attached_documents` (uuid array → `documents.id`) — so a sandbox row can carry the file/link you dropped
- `sandbox_items.upstream_entity` (jsonb `{kind, id}`) — so dragging an existing Spark/Task in records provenance

**Memory:**
- `mem://design/universal-triage-rollout.md` — what's mounted where + the rule "every triageable surface uses TriageCard"
- update `mem://design/triageable-interface.md` to mark rollout complete

## What this wave is NOT

- Not changing the underlying entities (Spark stays Spark, Decision stays Decision)
- Not introducing a new "object" — sandbox_items is the existing triage row
- Not auto-promoting anything (every promote is still a human click — canon)
- Not regrouping the sidebar
- Not touching Wave 5's `/start` or Wave 6's reconciliation work

## Sequencing

1. **`<UniversalDropZone />` + global "+" button** (~25%) — the thing you asked for first
2. **Migrations for attached_documents + upstream_entity** (~10%)
3. **`<TriageCard>` rollout to 6 surfaces** (~30%)
4. **`<FrameworksRail>` mounts on 3 detail pages** (~10%)
5. **`<UniversalFilterBar />` + URL search-param hook** (~20%)
6. **Memory canon updates** (~5%)

After Wave 7: you can drop a file, link, paragraph, or existing card into any page and it lands in Sandbox as `raw`. From there, every triage card looks and behaves identically — overlay it with any of F1–F8, then promote with one of six verbs. Every list page filters the same way. The "I don't know where this should go" feeling disappears because the gesture is the same everywhere.

Reply **"Run Wave 7"** to ship in this order, or **"Just the drop zone + TriageCard rollout first"** if you want to land the two highest-leverage pieces before the filter bar.

