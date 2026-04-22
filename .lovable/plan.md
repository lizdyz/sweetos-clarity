

# Fold the two refinements into the UX Auditor briefing + system prompt

Two small, surgical edits. No new features, no DB changes.

---

## What changes

### 1. `/mnt/documents/ux-auditor-briefing.md` — update §8 and §9

**§8 "What NOT to flag" — append:**

> Do not flag missing features from §5 (realtime, mobile, integrations, peer community) as UX findings — those are product roadmap items, not audit failures.

**§9 "Tone & format" — replace the existing tone guidance with:**

> One sentence per finding. No hedging language ("consider", "might", "could"). Every finding states the violation, the line, and the fix. That's it.

### 2. `supabase/functions/ux-audit/index.ts` — mirror both rules into `SYSTEM_PROMPT`

The briefing pack is the human-readable spec; the edge function's `SYSTEM_PROMPT` is what the AI actually sees at runtime. They must stay in sync, otherwise the rules don't bind.

Add to the existing system prompt:

- A "Do not flag" bullet listing the four roadmap exclusions (realtime, mobile, integrations, peer community)
- A "Tone" rule: one sentence per finding, no "consider/might/could", must contain violation + line number + fix

### 3. `mem://features/ux-auditor.md` — note both rules

Append a short "Tone & exclusions" subsection so future edits don't accidentally re-introduce hedging or roadmap flagging.

---

## Files touched

1. `/mnt/documents/ux-auditor-briefing.md` — §8 append, §9 rewrite
2. `supabase/functions/ux-audit/index.ts` — extend `SYSTEM_PROMPT` constant
3. `.lovable/memory/features/ux-auditor.md` — document the tone + exclusion rules

No DB migration. No UI change. Edge function redeploys automatically.

---

## What this is NOT

- Not changing the presence-check layer (the deterministic teeth we shipped last turn)
- Not changing scoring or canon-cap formula
- Not adding new findings categories — only constraining how findings are written

---

## After this lands

Next time you click Run on `/settings/ux-audit`, every AI finding reads like an instruction: "Line 47: status field uses plain `<Select>`, replace with `<StageSwimlanes>`." No "consider migrating," no "you might want to." And no findings about missing mobile responsiveness or realtime collab cluttering the list.

Reply **"Run tone tightening"** and I'll ship it.

