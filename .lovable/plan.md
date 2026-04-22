

# Pass 3 — Monster-file refactor + final type-safety sweep

Final cleanup pass. Splits the 4 oversized files into focused modules, kills the remaining `as any` casts, and leaves the codebase auditor-ready.

---

## What gets refactored

### 1. `entity-workspace.tsx` (1,085 lines) → `components/entity-workspace/`

Split by tab. Each subcomponent owns its own queries, types, and rendering.

```
components/entity-workspace/
  index.tsx              -- shell: header + tab router (~120 lines)
  overview-tab.tsx       -- summary, stats, hero metrics
  lenses-tab.tsx         -- LensWall + CribSheetCard
  measures-tab.tsx       -- MeasuresPanel wrapper
  components-tab.tsx     -- ComponentLinkPanel + build pipeline
  audit-tab.tsx          -- AuditTrailPanel + revisions
  types.ts               -- shared EntityWorkspaceProps, TabKey
```

Public API stays identical — `import { EntityWorkspace } from "@/components/entity-workspace"` still works. Zero call-site changes.

### 2. `_app.flightdeck.tsx` (840 lines) → route + extracted components

```
routes/_app.flightdeck.tsx     -- route shell + data fetching (~200 lines)
components/flightdeck/
  operator-row.tsx             -- per-operator swimlane row
  swimlane-board.tsx           -- the kanban grid
  filter-bar.tsx               -- top filter strip
  pipeline-view.tsx            -- the folded /pipeline view
```

### 3. `_app.relationships.$id.tsx` (679 lines) → route + extracted

```
routes/_app.relationships.$id.tsx  -- route shell + data (~180 lines)
components/relationship-detail/
  relationship-header.tsx          -- anatomy header card
  relationship-tabs.tsx            -- tab router
  overview-tab.tsx                 -- summary
  service-shape-tab.tsx            -- ServiceShapeStrip wrapper
  sweetcycle-tab.tsx               -- embedded SweetCycle board
```

### 4. `lib/entities.ts` (612 lines) → `lib/entities/`

```
lib/entities/
  index.ts          -- re-exports (preserves existing import paths)
  registry.ts       -- ENTITY_KIND map, kind metadata
  queries.ts        -- shared Supabase query builders
  labels.ts         -- display-name + plural helpers
  types.ts          -- EntityKind, EntityRow, etc.
```

### 5. Type-safety sweep

Kill the remaining 14 `as any` casts in app code (excluding `routeTree.gen.ts`). Most are stale Supabase row types — replace with proper `Database['public']['Tables'][...]['Row']` references or generated view types.

---

## Order of operations (one pass)

1. Create `components/entity-workspace/` modules; move logic out of monolith; replace original file with re-export shim
2. Create `components/flightdeck/` modules; slim route file
3. Create `components/relationship-detail/` modules; slim route file
4. Create `lib/entities/` modules; replace original with re-export shim
5. Sweep `as any` → typed rows
6. Typecheck → zero errors
7. Update `mem://design/audit-cadence.md` with new file-size cap (rule: any file >400 lines triggers a refactor task)
8. Append a note to `mem://features/ux-auditor.md` that Pass 3 is the first natural baseline opportunity

---

## What this is NOT

- Not changing any UI behavior — pure structural refactor
- Not touching `routeTree.gen.ts`, `types.ts`, or `client.ts`
- Not deleting any features — only moving code into smaller files
- Not running the auditor as part of this pass — that's a separate step you trigger manually after this lands

---

## After this lands

You'll have:
- 0 files over ~400 lines
- 0 `as any` in app code
- 0 known canon-debt
- A working UI/UX Auditor ready for baseline runs against every sidebar route

That closes the full audit/refactor arc. Future feature work resumes on a clean foundation.

Reply **"Run Pass 3"** and I'll ship the refactor + type sweep in one commit.

