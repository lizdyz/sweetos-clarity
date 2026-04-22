

# Fix the blank screen — stale client bundle from the SparkPath route additions

## What's happening

The dev server is healthy (returns 200, route tree is valid). The browser error `Failed to fetch dynamically imported module: virtual:tanstack-start-client-entry` means **your tab is holding a cached reference to a client bundle that no longer exists** — Vite regenerated the entry hash when the new SparkPath routes (`/p/$slug/seed`, `/_app/relationships/$id/sparkpath`) were added in the previous pass, and your open browser tab can't reconcile.

This is a transient browser-cache issue, not a code bug. The fix is a **hard reload** (Cmd/Ctrl + Shift + R, or close the tab and reopen). I'll also do a tiny cleanup pass while I'm in here so the page is clean when it loads.

## What I will do (one small pass)

1. **Touch the route tree** to force Vite to re-emit a fresh client entry — write `src/router.tsx` back to itself (no logical change) so the dev server invalidates the cached virtual module. After this, a normal refresh works without the user needing a hard reload.

2. **Clean up the half-finished Phase 2.10y leftovers in `_app.components.index.tsx`:**
   - The file imports `ComponentKindToggle` but never renders it.
   - `ComponentRow` types `component_kind` and `journey_id` but the `select(...)` call doesn't fetch them.
   - Either wire the toggle in (preferred — it's what you asked for) or remove the dead imports.
   
   I'll **wire the toggle in properly**: add `component_kind, journey_id` to the SELECT, add a `kind` state defaulting to `'user'`, render `<ComponentKindToggle />` above the filter strip, filter `enriched` by it, compute counts per kind. Tiny addition (~15 lines), zero risk, finishes what was started.

3. **Verify** the page renders by reading the dev-server log after the touch.

## What this is NOT

- Not touching the database, the SparkPath routes, or any seed data.
- Not resuming Phase B (Primer + Mirror authoring) — separate pass when you say go.
- Not deleting anything.

## After this lands

Refresh the preview (a normal refresh — Cmd/Ctrl + R). You should land on `/today` (or `/login` if signed out). If the screen is still blank, the next thing to check is whether your auth session expired during the work — I'll add a console diagnostic in that case.

