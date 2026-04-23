

# Wave 13 — Finish the 3 remaining items

Three small, well-scoped pieces to close out Wave 13.

## 1. Mount `<CapturePollinationChips>` on the Capture queue

The component already exists (`src/components/capture-pollination-chips.tsx`) and the `proposals` row now carries `matched_personas`, `matched_jtbds`, `matched_quests`, `matched_sparks`, `matched_ktis`, `intent`, and `suggested_kti_payload`. It's just unmounted.

**Edit:** `src/routes/_app.capture.tsx`
- On each proposal card in the queue list, render `<CapturePollinationChips>` below the existing tag chips, passing the proposal row.
- Component already handles its own loading/empty states.

## 2. JTBD detail "Work in flight" panel

The `jtbd_work_pipeline` view exists (created in the Wave 12 migration). Surface it.

**Edit:** `src/routes/_app.library.jtbd.$id.tsx`
- Add a new section under the existing JTBD detail content: **"Work in flight against this JTBD"**.
- Read `jtbd_work_pipeline` filtered by `jtbd_id = $id`, group by `subject_kind` (task / project / campaign), show count per group + a small list of the top 5 in each with a link to the entity.
- Empty state: "No active work yet — captures linked to this JTBD will show up here."

## 3. Switch remaining AI call sites to `getPrompt`

The `getPrompt` loader (`src/utils/prompts.server.ts`) exists. Five call sites still inline their prompts:

| File | Prompt key to use |
|---|---|
| `src/utils/workflows.functions.ts` | `workflow.step.run`, `workflow.step.summarize` |
| `supabase/functions/distill-brand-canon/index.ts` | `brand.distill` |
| `supabase/functions/generate-component-output/index.ts` | `component.output.generate` |
| `supabase/functions/generate-component-sparks/index.ts` | `component.sparks.generate` |
| `supabase/functions/generate-lens-perspectives/index.ts` | `lens.perspective.generate` |
| `supabase/functions/scan-signals/index.ts` | `signals.scan.classify` |
| `supabase/functions/ux-audit/index.ts` | `ux.audit.score` |

For each:
- Replace inlined `system` / `user` strings with `await getPrompt(key, { fallbackSystem, fallbackUser, fallbackModel })`.
- Inline string moves into the `fallback*` so behavior is identical if no DB row.
- Edge functions use a small inline copy of the loader (one fetch against `system_prompts` via service-role key) since they can't import `prompts.server.ts` directly.

**Migration:** seed `system_prompts` rows for the 7 new keys above so they appear in the Prompt Console immediately, with the inlined text as the seeded `system_prompt` / `user_prompt_template`.

## Files

**Edited:**
- `src/routes/_app.capture.tsx` — mount `<CapturePollinationChips>`
- `src/routes/_app.library.jtbd.$id.tsx` — add Work-in-flight panel
- `src/utils/workflows.functions.ts` — switch to `getPrompt`
- `supabase/functions/distill-brand-canon/index.ts`
- `supabase/functions/generate-component-output/index.ts`
- `supabase/functions/generate-component-sparks/index.ts`
- `supabase/functions/generate-lens-perspectives/index.ts`
- `supabase/functions/scan-signals/index.ts`
- `supabase/functions/ux-audit/index.ts`

**New:**
- `supabase/functions/_shared/get-prompt.ts` — tiny edge-function-side prompt loader (mirrors `prompts.server.ts`)
- One migration: seed 7 `system_prompts` rows so the Console shows them

## Sequencing

1. Migration: seed 7 prompt rows (~10%)
2. `<CapturePollinationChips>` mount on `/capture` (~10%)
3. JTBD "Work in flight" panel (~20%)
4. `workflows.functions.ts` → `getPrompt` (~15%)
5. Edge function shared loader + 6 edge functions switched (~45%)

## Not in this wave

- No schema changes beyond the `system_prompts` seed
- No new components
- No sidebar / route changes
- No edits to auto-generated files

After this: every AI call in the system reads from the Prompt Console, the Capture queue visibly shows what each capture pollinated, and JTBD detail shows the live work advancing each job. Wave 13 closed; Wave 12 fully delivered.

