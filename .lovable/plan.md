

# Wave 21 — Final wiring (close out)

The architecture is in place. What remains is the **wiring**: mounting the SweetLens panel everywhere, killing the legacy surfaces, and tightening the sidebar so the muddle is actually gone.

## What's done
- DB: `lenses` extended, `lens_object_fit` + `lens_outputs` created and seeded.
- `<ObjectCompanion>` family + **SweetLens** trigger button.
- `/settings/lens-studio` with Library / Definition / Persona / Object fit / Outputs tabs.
- `/bizzybots` redirected to the Studio.

## What still needs doing

### 1. Mount SweetLens everywhere it belongs
For each detail page below: add a `useState` toggle and render `<SweetLensButton>` in the header + `<ObjectCompanion>` as a right rail when active. Where an `<EntityFrameworksRail>` exists, **remove it** (it's the placeholder this replaces).

| Route | Object kind | Action |
|---|---|---|
| `_app.tasks.$id.tsx` | `task` | Replace `EntityFrameworksRail` |
| `_app.decisions.$id.tsx` | `decision` | Replace `EntityFrameworksRail` |
| `_app.sparks.$id.tsx` | `spark` | Add fresh |
| `_app.quests.$id.tsx` | `quest` | Add fresh |
| `_app.projects.$id.tsx` | `project` | Add fresh |
| `_app.missions.$id.tsx` | `mission` | Add fresh |
| `_app.journeys.$id.tsx` | `journey` | Add fresh |
| `_app.engagement-plans.$id.tsx` | `engagement_plan` | Add fresh |
| `_app.sessions.$id.tsx` | `session` | Add fresh |
| `_app.relationships.$id.tsx` | `relationship` | Add fresh |
| `_app.components.$id.tsx` | `component` | Add fresh |
| `_app.personas.$id.tsx` | `persona` | Add fresh |

`/sandbox` board: swap its right rail for `<ObjectCompanion>` bound to the selected sandbox item.

### 2. Kill the placeholders
- Delete `src/components/frameworks-rail.tsx`
- Delete `src/components/entity-frameworks-rail.tsx`
- Search for residual imports and clean them up.
- `src/lib/triageable.ts` → drop `OVERLAY_REGISTRY` if no consumer remains.

### 3. Redirect legacy lens routes
Rewrite these as 1-line redirects to `/settings/lens-studio` so old links still land cleanly:
- `_app.settings.lenses.tsx`
- `_app.settings.lenses.$id.tsx`
- `_app.settings.lens-canon.tsx`

### 4. Sidebar cleanup (the muddle)
In `src/components/sidebar-nav.tsx`:
- **Library group**: change the `BizzyBots` row → `Lens Studio` pointing at `/settings/lens-studio`, hint "Define lenses · personas · object fit".
- **Settings group**: remove `Lens Canon` and `BizzyBot prompts` rows (folded into Studio). Update Prompt Console hint to "Non-lens AI prompts (capture, OCDA, scanners) — lens prompts live in Lens Studio".

### 5. Prompt Console scoping
In `_app.settings.prompts.tsx`: filter out `scope='lens'` rows from the list and add a one-line banner: *"Lens prompts now live in **Lens Studio**."* with a link.

### 6. Lens Wall structured-outputs footer
In `src/components/lens-wall.tsx` and `src/components/lens-perspective-card.tsx`: append `<LensOutputsList sourceKind=… sourceId=…>` so the wide Domain/Tenet view also surfaces structured outputs (parity with the rail).

### 7. Memory writes
- New `mem://design/lens-system.md`: the 3-layer model (Lens · Interrogation · Object Companion), Lens-as-unified-object rule, **SweetLens button** is the canonical trigger, Lens Studio is the only admin surface.
- Update `mem://design/lenses-bizzybots.md`: BizzyBot = persona attribute of a Lens; Framework = structure attribute; same row.

## Plus: Wave-20 leftovers still open

These were planned but not finished and should land in the same pass since they share files:

- **PageHeader contract** still missing on the remaining detail/index routes that didn't get the upgrade — apply the `connectsTo` + `nextSteps` pattern across: Today, Operate/OCDA, Flightdeck, Sweetscan, Calendar, Capture, Import, Sessions Bank, Operators detail, Engagement Plans index/detail.
- **OCDA cockpit**: convert lanes into drop targets (reuse `useDragToStatus`), union the Observe lane sources (`proposals + sparks + inbound_signals + kti_scans last 24h`), add the inline "Log decision" composer in Decide, and union running workflow runs into Act.
- **`<OCDAStageChip>`** also mounted on Project, Spark, Quest detail headers (currently only on Task and Decision).
- **FlowStrip** at the top of `/capture`, `/sandbox`, `/queue` showing `Capture → Sandbox → Queue → Routed` with current step highlighted.
- **Library "used by" chip** on rows of `/library/jtbd`, `/library/ktis`, `/personas`, `/outcomes`, `/components`, `/playbooks`.
- Confirm `lens_outputs`, `open_decisions`, `decisions` are in the audit-log allow-list trigger.

## File plan

**Edited (heavy)**
- 12 detail routes listed above + `_app.sandbox.tsx` for SweetLens mount.
- `src/components/sidebar-nav.tsx` — Library + Settings cleanup.
- `src/components/ocda-cockpit.tsx` — drop targets, union sources, Decide composer.
- `src/components/lens-wall.tsx`, `src/components/lens-perspective-card.tsx` — outputs footer.
- `src/routes/_app.settings.prompts.tsx` — scope filter + banner.
- ~10 PageHeader-only edits for the remaining routes.

**Edited (light, redirects)**
- `_app.settings.lenses.tsx`, `_app.settings.lenses.$id.tsx`, `_app.settings.lens-canon.tsx`.

**New**
- `src/components/flow-strip-mount.tsx` (or just inline the existing `flow-strip.tsx` on the 3 routes).
- `src/components/library/used-by-chip.tsx`.
- Memory: `mem://design/lens-system.md`.

**Deleted**
- `src/components/frameworks-rail.tsx`
- `src/components/entity-frameworks-rail.tsx`

**Migration (one)**
- Audit allow-list: add `lens_outputs` (and confirm `open_decisions`, `decisions`).

## Sequencing

1. SweetLens mount across the 12 routes + sandbox swap (~30%)
2. Sidebar cleanup + legacy route redirects + Prompt Console scoping (~10%)
3. Delete frameworks rails + cleanup imports (~5%)
4. Lens Wall outputs footer (~5%)
5. OCDA cockpit drop targets + Decide composer + source union (~20%)
6. OCDAStageChip on remaining detail headers (~5%)
7. FlowStrip on Capture / Sandbox / Queue (~5%)
8. Library "used by" chips (~10%)
9. Remaining PageHeader contract upgrades (~5%)
10. Audit-log allow-list migration + memory writes (~5%)

## Not in this wave
- No new lenses beyond F10–F12 already seeded.
- No changes to `generate-lens-perspectives` edge function signature (structured outputs come later).
- No IA rewrite — Library and Settings stay as groups; just one row each gets renamed/removed.

## After this wave
SweetLens lives on every meaningful object. The sidebar has one entry — Lens Studio — for everything lens-related. The OCDA cockpit accepts drag-to-stage. Frameworks Rail is deleted. The "BizzyBots vs Frameworks vs Prompts" muddle is gone.

