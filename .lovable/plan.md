

# Phase 2.7.1: Reseed canonical 5 Ps + 5 Ls from your Notion

## What I got wrong

I seeded `excellence_perspectives` with placeholder names (Purpose, People, Process, Performance, Progress). Your Notion Decision Log (dated 2026-03-25, status Closed) confirms the canonical set is different. The earlier "Performance/Platform" variant is explicitly marked **deprecated** in your own Decision page.

## Canonical values from your Notion (verbatim)

**5 Ps** — from the "5Ps = Purpose / People / Process / Product / Profit" decision page:

| Code | Name |
|------|------|
| P1 | Purpose |
| P2 | People |
| P3 | Process |
| P4 | Product |
| P5 | Profit |

**5 Ls** — already correct in your `maturity_level` enum, confirmed by the "5Ls order" decision page (L1 Lacking, L2 Learning, L3 Launching, L4 Leveraging, L5 Leading). No change needed.

## What I'll change

### Single data migration on `excellence_perspectives`
- Update the 5 existing rows in place (don't delete — `excellence_rubric` already references them via `perspective_id`):
  - P3: rename `Process` → keep as `Process` (no change)
  - P4: rename `Performance` → `Product`
  - P5: rename `Progress` → `Profit`
  - P1, P2: confirm `Purpose`, `People` (no change)
- Update `description` text on each row to reflect the canonical lens definition.
- Existing `excellence_rubric` rows (any seeded checklist content tied to the placeholder P4/P5) keep their `perspective_id` link — only the human-readable label/description changes. Nothing is orphaned.

### Settings UI label
- `/settings/excellence` already reads `excellence_perspectives` live, so the new names appear automatically. No code change required there.

### Memory
- Save `mem://design/canon-5ps` and update `mem://index.md` Core so I never re-introduce the deprecated Platform/Performance variant in any future seed.

## Files touched

- New migration: `<ts>_phase2.7.1_canonical_5ps.sql` — UPDATE statements on `excellence_perspectives` rows by `code` (P1–P5).
- `mem://design/canon-5ps` (new memory file).
- `mem://index.md` (append Core line).

## What I'm NOT touching

- `maturity_level` enum (5 Ls already correct).
- `excellence_rubric` rows, scores, RLS, or any UI route — labels propagate via FK.
- The 22 Domains, 22 Tenets, industries, capture flow, queue, sidebar — all stay.

## Note for next round

Your Notion also documents 8 Frameworks as **queryable lenses, not modules** (OCDA, Gestalt, 4Ds, 5Ps, 3Cs, 5Ls, Co-Evolution, Rhetorical) and 9 BizzyBots as orientation signals. The current schema only models 5Ps as a perspective table. If you want the other 7 frameworks and the 9 BizzyBots as first-class lenses against rubric/quest/spark rows, that's a separate small migration — flag it and I'll plan it next. Not doing it in this pass.

