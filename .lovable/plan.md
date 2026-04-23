

# Wave 6 — Canon Reconciliation (close the 8 gaps in YOUR vocabulary)

You're right to evolve — but only **toward** the canon dump you just shared, not away from it. The app already has 95+ tables and most of your families exist. What's missing is the **wiring** that makes the 8 reconciliation issues you flagged actually true in the database and UI.

This wave is not new vocabulary, not new layers, not regrouping. It's **closing the gaps you already named** so the system finally matches the doc.

## How your canon dump maps to what already exists

| Family from your dump | What's already in the app | Gap to close in Wave 6 |
|---|---|---|
| F1 Reference/Taxonomy (Domain, Tenet, Maturity, BizzyBot, Framework) | `domains`, `tenets`, `lenses`, excellence levels | ✅ already canon — surface the F1–F8 **Framework Lens overlay** as a switcher on list pages |
| F2 Type System (Spark/Deliverable/Outcome/Reflection/Advancement/Confidence/Decision types) | `sparks.kind`, `outcomes`, `decisions`, `excellence_scores.confidence` | ⚠ split **Reflection** into Spark-type vs lifecycle event |
| F3 Mission → Journey → Quest → Spark → Component | All 5 tables exist + `project_components`, `task_components`, `workflow_components` | ⚠ wire **Map/Machine session evidence → Component maturity** |
| F4 Platform (SweetSync, Vault, Portal, etc.) | `/vault`, `relationship_portals`, `client_mirror_portals` | ✅ already canon |
| F5 Commercial (Relationship→Client, Session, Domain Assessment, SweetCycle, Persona, Playbook) | `relationships`, `sessions.sweetcycle_phase`, `domain_assessments`, `personas`, `playbooks` | ⚠ make **Domain Assessment a living model** (versioned) |
| F6 Knowledge & Governance (Input Library, Workflow Library, Canon Gate, IP) | `entity_canon`, `workflow_states`, `seed_templates` | ✅ already canon |
| F7 Infrastructure (Data Class A–D, AI Routing, Advisor pattern) | partial — Class A/B/C/D not modeled on artifacts | 🛠 backlog (not Wave 6) |

## The 8 reconciliation issues — exactly what Wave 6 does about each

| # | Issue (your words) | Wave 6 move | Touches |
|---|---|---|---|
| 1 | **Component vs Module vs Capability** | Confirm in canon: Component = stored, Capability = derived view, Module = tag on `playbooks`/`workflows`. Add a `capabilities` SQL view (Components ≥ L3 grouped by Journey). No new table. | migration (view only) + `/components` list shows derived capabilities tab |
| 2 | **Quest = exactly 1 Deliverable** | Hold the rule for Quests. For Sessions, formalize `session_deliverables` (already exists). Add a `deliverable_source` enum on documents: `quest` / `session` / `manual`. Show source chip everywhere. | migration + `<DeliverableSourceChip>` component on Vault/Documents |
| 3 | **Map/Machine work counting in SweetSync** | Add `session_components` link with `advancement_type` (already exists ✅) + a trigger: when a Session writes `session_components` with `Primary`, advance the Component the same way Quest completion does. This makes services *retroactively count*. | migration (trigger) + `/sessions/$id` "Advances" panel |
| 4 | **Domain Assessment as living model** | Add `domain_assessment_versions` table. Mirror writes v1; subsequent Sessions / SweetScan signals append v2+. Existing `domain_assessments` becomes a current-version view. | migration + `/domain-assessments/$id` shows version timeline |
| 5 | **SweetCycle is a state machine, not entity** | Already correct in schema (`sessions.sweetcycle_phase`). Just add a canon note + remove the standalone "SweetCycle" framing from any UI that treats it as a peer entity. | memory canon update only |
| 6 | **Deliverable Catalog vs instances** | The catalog lives in `entity_canon` + `session_templates` + `playbooks`. Instances live in `documents`, `session_deliverables`, `component_outputs`. Add a `catalog_entry_id` nullable FK on `documents` so instances can point home. Add `<CatalogLinkChip>` in document detail. | migration (one column) + chip component |
| 7 | **Reflection: Spark type vs lifecycle event** | Keep `sparks.kind = 'reflection'` for in-Quest reflection inputs. Add a new `reflection_events` table for milestone-triggered reflections (Quest complete, Component level-up, Journey milestone, Periodic, Custom). Fire from existing triggers (`trg_quest_complete_outcome` etc.). | migration (new table + trigger updates) + small `/reflections` index page (or tab on `/today`) |
| 8 | **8 Modules page should be tags** | No `/modules` route exists ✅. Add a `module_tags` array on `playbooks` and `workflows` so the 8 commercial groupings live as tags. Render as chips. | migration (column) + chip in playbook/workflow lists |

## The Framework Lens overlay (F1–F8) — finally surfaced

Your dump is explicit: **"These are VIEW LAYERS. The data model doesn't change."** Wave 6 makes that real with one component:

`<FrameworkLensSwitcher />` — a small dropdown that mounts on the top of any list page (Sparks, Decisions, Quests, Components, Today). Switching the lens **re-groups the same rows** under the chosen framework's stages. No data migration, no new entity. Just a projection.

```text
[ Framework lens: ▾ F1 OCDA ]
  Observe (12)  · Choose (4)  · Decide (3)  · Act (8)

[ Framework lens: ▾ F4 5Ps ]
  Purpose (6) · People (5) · Process (9) · Product (4) · Profit (3)

[ Framework lens: ▾ F6 5Ls ]
  Lacking · Learning · Launching · Leveraging · Leading
```

The grouping logic reads existing tags (`ocda_stage`, `tagged_p`, `current_maturity_level`, etc.). Where a row has no tag for a chosen lens, it lands in an "Unmapped" column you can drag from. **Eight lenses, one component, zero new vocabulary.**

## So — is it right or wrong to evolve?

**Right when:** the evolution closes a gap you already named in canon. All 8 Wave 6 moves are on your own list.

**Wrong when:** evolution invents new framing (what I did with Capture/Decide/Operate/Reflect — that was a drift, you correctly pushed back). Wave 5 fixed the framing. Wave 6 fixes the wiring.

## Files I'll touch

**Migrations (one batch):**
- `capabilities` view (Components ≥ L3 grouped by Journey)
- `documents.deliverable_source` enum + `documents.catalog_entry_id`
- `session_components` advancement trigger (mirrors quest completion)
- `domain_assessment_versions` table + view making `domain_assessments` current-version
- `reflection_events` table + trigger updates on quest/journey/mission completion
- `playbooks.module_tags` + `workflows.module_tags`

**New components:**
- `src/components/framework-lens-switcher.tsx` — F1–F8 dropdown + grouping logic
- `src/components/deliverable-source-chip.tsx`
- `src/components/catalog-link-chip.tsx`
- `src/components/capabilities-derived-panel.tsx` (mounts on `/components`)
- `src/components/reflection-event-row.tsx`
- `src/components/domain-assessment-timeline.tsx` (mounts on `/domain-assessments/$id`)

**Edited (small mounts):**
- `/sparks`, `/decisions`, `/quests`, `/components`, `/today` — mount `<FrameworkLensSwitcher />`
- `/sessions/$id` — add Advances panel using new trigger output
- `/domain-assessments/$id` — show version timeline
- `/components` — add Capabilities tab
- `/vault` & `/documents` — add source chip + catalog link chip

**Memory:**
- `mem://design/canon-reconciliation-wave6.md` — the 8 issues × what shipped
- update `mem://design/sidebar-ia.md` confirming SweetCycle is state-machine-only

## What this wave is NOT

- Not deleting any route or entity
- Not regrouping the sidebar (locked)
- Not introducing new layer vocabulary
- Not building the Wave-7 Data Class A/B/C/D system (that's the Infrastructure wave)
- Not building the BizzyBot active-scanning gap (separate wave)
- Not touching Wave 4's `/today` structure — only adding the lens switcher above it

## Sequencing

1. **Migrations** (~30%) — one approval, all 6 schema moves
2. **Framework Lens switcher** (~25%) — the highest-leverage piece; reuses everywhere
3. **Reflection events + trigger wiring** (~15%)
4. **Map/Machine → Component advancement trigger + Advances panel** (~10%)
5. **Domain Assessment versioning + timeline** (~10%)
6. **Source/catalog chips + capabilities view + module tags** (~5%)
7. **Memory canon updates** (~5%)

After Wave 6: the database matches the doc you wrote. The 8 reconciliation issues are closed (or explicitly deferred with a written reason). The F1–F8 Framework Lens overlay is real and reusable. **Zero new vocabulary introduced.**

Reply **"Run Wave 6"** to ship in this order, or pick a subset (e.g. *"Just Framework Lens switcher + reflection events first"*) if you want to land the highest-leverage pieces alone.

