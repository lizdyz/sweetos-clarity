

# Wave 8 — Universal entity shell + finish Wave 7 (in YOUR canon)

Your collaborator's mockups are sharp. Two of their three big ideas are pure wins and we should ship them. The third (renaming sidebar groups, adding a "Canon" group) **conflicts with your locked sidebar IA canon** (`mem://design/sidebar-ia.md`), so I'll achieve their *intent* (Wisdom can find canon without admin vibes) without renaming groups.

I'll also finish the four Wave-7 leftovers you listed.

## What from the mockups we adopt vs reject

| Mockup proposal | Verdict | Why |
|---|---|---|
| **Universal entity shell** (Zones 1–5: header · work-context strip · connection rail · tabbed content · evidence footer) | ✅ **Adopt** — this is the answer to "I want to use every page to its max" | Already half-built (`<DetailShell>`, `<WorkContextStrip>`, `<WalkMenu>`); Wave 8 finishes it |
| **Canon tab on every detail page** | ✅ **Adopt** | One read-only tab pulled from `entity_canon` so canon is visible without going to Settings |
| **Three-layer Excellence model surfaced** (Canon / Maturity / Sparks+Guardrails) | ✅ **Adopt as visual treatment, not new entities** — all three already exist in DB | Maturity dot + canon-guardrail chip in Zone 1 of every shell |
| **"Ship status" page in a new "Canon" sidebar group** | 🟡 **Adopt the page, not the regroup** | Build `/start/ship-status` as a sub-route of `/start` (canon-locked sidebar stays untouched) |
| **6-group sidebar rename** (Today/Work/People/Library/Canon/Settings) | ❌ **Reject** | `mem://design/sidebar-ia.md` is locked at your 7-group verb-first IA. Renaming would break Wave 5 canon. |
| **Move SweetSync entities (Missions/Journeys/Quests/Sparks/Domain Assessments) onto Relationship detail tabs** | 🟡 **Half-adopt** — keep the global routes (you use them), ALSO surface them as tabs on `/relationships/$id` | No deletion, additive only |
| **Delete stub routes (`/pipeline`, `/planner`, `/queue`, `/my-tasks`)** | 🟡 **Defer to Wave 9** | They're 9-line stubs but deleting routes deserves its own confirmation pass |
| **Flightdeck absorbs OCDA Cockpit** | ❌ **Reject** | Wave 5 just made `/operate/ocda` a first-class page — flipping it now would erase recent canon |

## Part A — Universal Entity Shell (the big move)

One component, one shape, every detail page. The mockup names it perfectly — Zone 1 → Zone 5. You already have most of the parts; Wave 8 wires them into one shell.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Z1  [Icon] Entity name · kind chip · state pill · scope · 🛡 canon · ⋯walk │  ← canonical header
├──────────────────────────────────────────────────────────────────────┤
│ Z2  Relationship › Plan › Service › Session › this entity              │  ← work context strip
├──────────┬───────────────────────────────────────────────────────────┤
│ Z3       │ Z4  [Overview] [Build] [Story trail] [Measures] [Canon]    │
│ ↑ Up     │                                                            │
│ ↓ Down   │     Tab body (entity-specific)                             │
│ → Produc │                                                            │
│ ← Consum │                                                            │
│ ⤴ Advances│                                                           │
│ # Tagged │                                                            │
├──────────┴───────────────────────────────────────────────────────────┤
│ Z5  ▾ Evidence footer · audit log · generation metadata · revisions  │  ← collapsible
└──────────────────────────────────────────────────────────────────────┘
```

**New component:** `src/components/entity-shell.tsx` — composes header + work-context strip + connection rail + tabs + evidence footer. Takes `{kind, id, primaryTabs, evidenceQuery}`.

**New tabs added everywhere:**
- **Canon tab** — read-only view of `entity_canon` row for this entity_kind (what it is · what good looks like · inputs · outputs · loop). Pulled from existing `entity_canon` table. Edit-link goes to `/settings/canon` (Wisdom can read everywhere, edit in one place — answers the mockup's "Wisdom can access canon without admin vibes" intent).
- **Story trail tab** — already exists as `<MasterStoryTrail>`, just standardize the mount.

**Canon guardrail chip in Zone 1** — `<CanonGuardrail>` already exists. Mount on every shell so red/amber/green is visible at a glance.

## Part B — Finish Wave 7 (the four you listed)

| Surface | Mount | Note |
|---|---|---|
| `/capture` | `<TriageCard>` rows + `<UniversalDropZone />` | Replace bespoke triage row with shared card |
| `/sweetscan` | `<TriageCard>` for `inbound_signals` | Replace `<InboundSignalCard>` |
| `/sparks` index | `<TriageCard>` for raw sparks | Adds the overlay rail to every spark |
| `/decisions` index | `<TriageCard>` for `state='proposed'` | Promotes to Decided / Archived |
| `/operate/ocda` Observe lane | `<TriageCard>` rows | Same gesture: select → frame → route to Choose |
| `/today` | `<UniversalDropZone />` collapsed at top | Drop from your morning surface |
| Task / Decision / Spark detail pages | `<FrameworksRail>` in right rail | Run any of F1–F8 on any open work item |

## Part C — `/start/ship-status` (Wisdom's page)

The collaborator nailed this one. New child route under `/start` — no sidebar regroup needed.

```text
SHIP STATUS — what is real vs aspirational
─────────────────────────────────────────────
LIVE (90%+ wired)              35 routes
  Components · Workflows · Sessions · Tasks · …

PARTIAL (built, not fully wired)  18 routes
  Flightdeck (5 views in 1) · Sweetcycle multi-rel board · …

STUB (under 50 lines)              4 routes
  /pipeline /planner /queue /my-tasks → Wave 9

ROUTE COUNT: 86 · TABLE COUNT: 111 · VIEW COUNT: 14
```

Reads live from filesystem walk + the `entity_canon` table. Updates every time you ship.

## Part D — Relationship detail gets SweetSync tabs (additive)

Add tabs to `/relationships/$id` that surface this client's slice:
- **Missions** tab — filtered list of `missions` where `relationship_id = $id`
- **Journeys** tab — same filter pattern
- **Quests** tab — same
- **Sparks** tab — same
- **Mirror** tab — Domain Assessment (already exists, just promote it to a tab)

Global routes (`/missions`, `/journeys`, etc.) **stay**. You can still see all clients' missions from the global rail. The Relationship tabs are an additional view, not a replacement.

## Files I'll touch

**New components:**
- `src/components/entity-shell.tsx` — the universal Zone 1–5 shell
- `src/components/entity-canon-tab.tsx` — read-only Canon tab body
- `src/components/connection-rail.tsx` — Zone 3 (Up · Down · Produces · Consumes · Advances · Tagged)
- `src/components/evidence-footer.tsx` — Zone 5 collapsible
- `src/components/start/ship-status-board.tsx` — live route/table/view tally
- `src/components/relationship/relationship-sweetsync-tabs.tsx` — Missions/Journeys/Quests/Sparks/Mirror tabs

**New routes:**
- `src/routes/_app.start.ship-status.tsx`

**Edited (mounts only):**
- ~12 detail routes — wrap content in `<EntityShell kind=… id=…>` (tasks, projects, components, sessions, workflows, quests, sparks, decisions, relationships, missions, journeys, playbooks)
- `src/routes/_app.capture.tsx` · `_app.sweetscan.tsx` · `_app.sparks.index.tsx` · `_app.decisions.index.tsx` · `_app.operate.ocda.tsx` · `_app.today.tsx` — Wave 7 mounts
- `src/routes/_app.tasks.$id.tsx` · `_app.decisions.$id.tsx` · `_app.sparks.$id.tsx` — `<FrameworksRail>` in right rail
- `src/routes/_app.relationships.$id.tsx` — mount sweetsync tabs

**Memory:**
- `mem://design/universal-entity-shell.md` — Zone 1–5 spec, what mounts where, the rule "every detail page uses EntityShell"
- `mem://design/canon-tab-rule.md` — Canon tab is read-only on every detail; edit only at `/settings/canon`
- update `mem://design/sidebar-ia.md` reaffirming the locked 7-group IA (so the next session doesn't try to regroup)

## What this wave is NOT

- Not renaming sidebar groups (canon-locked)
- Not deleting any route (stubs deferred to Wave 9)
- Not absorbing OCDA into Flightdeck (Wave 5 canon)
- Not new entities (every part reads existing tables)
- Not editing any auto-generated file

## Sequencing

1. **Wave 7 finish** (~20%) — TriageCard rollout to 5 surfaces + FrameworksRail on 3 detail pages + drop zone on /today
2. **`<EntityShell>` component + Canon tab + connection rail** (~35%) — the centerpiece
3. **Mount EntityShell on 12 detail routes** (~25%) — one-line wraps, no rewrites
4. **`/start/ship-status` page** (~10%)
5. **Relationship SweetSync tabs** (~7%)
6. **Memory canon updates** (~3%)

After Wave 8: every detail page in the app has the same shell — same header, same connection rail, same Canon tab visible in one click, same evidence footer. Walking the graph feels identical from any starting point. Triage feels identical from any starting point. The collaborator's two best ideas land. Your locked sidebar canon stays intact.

Reply **"Run Wave 8"** to ship in this order, or **"Just EntityShell + Canon tab first"** to land the centerpiece before the Wave-7 mounts.

