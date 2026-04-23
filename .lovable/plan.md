

# Wave 9 — Wire the dead buttons + finish the Wave-8 mounts

You're right — I left a trail of half-finished work. Here's the honest audit and what to ship to make every page feel real.

## The 4 dead "+ New" buttons (the ones you're clicking)

| Page | Dead button | Why it does nothing |
|---|---|---|
| `/components` | **+ New component** | Renders, no `onClick` |
| `/projects` | **+ New project** | Renders, no `onClick` |
| `/relationships` | **+ Add relationship** | Renders, no `onClick` |
| `/tasks` | **+ New task** | Renders, no `onClick` |

These are the most visible "nothing happens" moments. Every other button I scanned has a real handler.

## What from Wave 8 actually shipped vs what's still pending

**Shipped ✅**
- `<EntityShell>` component built
- `<EntityCanonTab>`, `<ConnectionRail>`, `<EvidenceFooter>`, `<EntityFrameworksRail>` built
- `<UniversalDropZone>` mounted on `/today`, `/capture`, and as global `+` in topbar
- `<TriageCard>` rolled out to `/sweetscan`, `/sparks` index, `/decisions` index
- `<UniversalFilterBar>` refactored to honor form-control canon
- Stub routes `/pipeline`, `/planner`, `/queue`, `/my-tasks` redirect cleanly

**NOT shipped (you're right to call it out) ❌**
- `<EntityShell>` is built but **mounted on zero detail routes** (it lives in the file but no page imports it)
- `<EntityFrameworksRail>` not mounted on `/tasks/$id`, `/decisions/$id`, `/sparks/$id`
- TriageCard not in `/operate/ocda` Observe lane (still bespoke)
- TriageCard not in `/capture` (still bespoke triage rows)
- `/start/ship-status` page never created
- Relationship SweetSync tabs never created
- `mem://design/canon-tab-rule.md` never written

## Wave 9 — three crisp moves

### 1. Wire every "+ New" button (highest visibility)

Each opens a slide-in `<Sheet>` with a real create form. Same pattern, four entities:
- `+ New component` → `<ComponentCreateSheet>` (name · kind · maturity L1)
- `+ New project` → `<ProjectCreateSheet>` (name · relationship · status)
- `+ Add relationship` → `<RelationshipCreateSheet>` (name · org · industry · stage)
- `+ New task` → `<TaskCreateSheet>` (title · operator · due · scope)

All four follow the form-control canon (Wave 8): Select for owner/status, Combobox for relationship, Calendar popover for due, Switch for "create another after save". On save → invalidate query → toast → navigate to detail page.

### 2. Finish the Wave-8 mounts I promised

| Mount | Where | What it gives you |
|---|---|---|
| `<EntityFrameworksRail>` in right rail | `/tasks/$id` · `/decisions/$id` · `/sparks/$id` | Run any of F1–F8 on the open item |
| `<TriageCard>` rows | `/operate/ocda` Observe lane | One gesture from Capture → Choose |
| `<TriageCard>` rows | `/capture` proposal queue | Replace bespoke triage row |
| `<EntityShell>` wrap | 8 detail routes (tasks, projects, components, sessions, workflows, quests, sparks, decisions) | Zone 1–5 layout consistent everywhere |

### 3. Two missing surfaces

- **`/start/ship-status`** — the "what's real vs aspirational" board pulled from a live route count + entity_canon coverage. Reachable from `/start` via a "Ship status →" link.
- **Relationship SweetSync tabs** on `/relationships/$id` — additive Missions / Journeys / Quests / Sparks / Mirror tabs filtered by `relationship_id`.

## Files

**New:**
- `src/components/component-create-sheet.tsx`
- `src/components/project-create-sheet.tsx`
- `src/components/relationship-create-sheet.tsx`
- `src/components/task-create-sheet.tsx`
- `src/components/start/ship-status-board.tsx`
- `src/components/relationship-sweetsync-tabs.tsx`
- `src/routes/_app.start.ship-status.tsx`
- `mem://design/canon-tab-rule.md`

**Edited (mounts/wires only):**
- `src/routes/_app.components.index.tsx` · `_app.projects.index.tsx` · `_app.relationships.index.tsx` · `_app.tasks.index.tsx` — wire the four "+ New" buttons
- `src/routes/_app.tasks.$id.tsx` · `_app.decisions.$id.tsx` · `_app.sparks.$id.tsx` — mount FrameworksRail
- `src/components/ocda-cockpit.tsx` — TriageCard rows in Observe lane
- `src/routes/_app.capture.tsx` — TriageCard rows replacing bespoke triage
- 8 detail routes — wrap content in `<EntityShell>` (one-line wraps, no rewrites)
- `src/routes/_app.relationships.$id.tsx` — add SweetSync tabs
- `src/routes/_app.start.tsx` — link to `/start/ship-status`

## What this wave is NOT

- No new entities, no migrations
- No sidebar regroup (still locked)
- No edits to auto-generated files
- No deletions (the four redirect stubs stay — they protect old bookmarks)

## Sequencing

1. Four "+ New" create sheets (~30%) — kills the "nothing happens" feeling immediately
2. EntityShell wraps on 8 detail routes (~25%)
3. FrameworksRail + TriageCard mounts (~20%)
4. `/start/ship-status` page (~12%)
5. Relationship SweetSync tabs (~10%)
6. Memory canon update (~3%)

After Wave 9: every button visible in your sidebar leads somewhere, every "+ New" actually creates, every detail page has the same shell, and every triage surface uses the same card. No more dead clicks.

Reply **"Run Wave 9"** to ship in this order, or **"Just the four + New buttons first"** to land the most painful fix alone.

