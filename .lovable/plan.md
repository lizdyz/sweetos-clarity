

# Next move — Pass 2B (UI/UX Auditor agent) + an LLM-ready briefing pack

You're at a clean checkpoint:
- Pass 1 (security) ✅
- Pass 2A (route triage) ✅
- Pass 2C (canon guardrails + Quest anatomy) ✅
- Remaining: **Pass 2B (UI/UX Auditor)** and **Pass 3 (monster-file refactor)**

You also flagged two new things:
1. There are real UX issues on specific pages you've been hitting (you didn't list them — I'll capture them as part of 2B's seed run)
2. You want a **briefing pack you can hand to another LLM** so it can write the "masterful prompt" the auditor will use

Best move = **ship 2B now and bundle the briefing pack into the same pass.** The auditor needs a great prompt either way; having your other LLM polish it is exactly the right division of labor.

---

## What gets built

### 1. The auditor (in-app)

```
/settings/ux-audit
   │
   ├─ Route picker (single route OR "audit all sidebar routes")
   ├─ Canon-rule checkboxes (which rules apply: TimeControls, CanonGuardrail,
   │   MeasuresPanel, StageSwimlanes, DueDateChip, etc.)
   ├─ Calls edge function `ux-audit` →
   │     1. Reads route source file (passed in from client)
   │     2. Reads Tailwind tokens from src/styles.css
   │     3. Reads relevant memory rules
   │     4. Calls Lovable AI (google/gemini-3-flash-preview) with the
   │        masterful prompt + tool-calling schema
   │     5. Persists result in `ux_audit_runs`
   │
   └─ Result cards: score chips (hierarchy, density, states,
      a11y, canon-adherence), expandable findings with
      file:line + fix hint, "Re-audit", "Mark fixed",
      "Open file in editor" link
```

Cost control: never auto-fires. Manual click only. Same canon-first / AI-on-demand pattern as Sparks and Lenses.

### 2. Schema (1 migration)

```
ux_audit_runs
  id uuid pk
  route_path text
  source_path text             -- e.g. src/routes/_app.relationships.$id.tsx
  audited_at timestamptz default now()
  audited_by uuid
  model text                   -- which model produced it
  scores jsonb                 -- {hierarchy, density, states, a11y, canon}
  findings jsonb               -- [{severity, message, file, line, fix_hint, rule}]
  guardrails_missing text[]    -- ['CanonGuardrail','TimeControls', ...]
  ux_issues_user_reported text[] -- the issues you've been seeing on this page
  status text check (status in ('open','acknowledged','fixed'))
  RLS: workspace-member read/write
```

### 3. Files

- `supabase/functions/ux-audit/index.ts` — AI call with tool schema
- `src/routes/_app.settings.ux-audit.tsx` — cockpit
- `src/components/ux-audit-card.tsx` — per-route result card
- 1 migration + RLS

---

## The "masterful prompt" briefing pack for your other LLM

This is a single Markdown file written to `/mnt/documents/ux-auditor-briefing.md` that you forward verbatim. It contains everything that LLM needs to author the prompt:

1. **Mission** — score and improve any page in this codebase against canonical SweetBOS rules
2. **The canon rules to enforce** (extracted from `mem://design/*` and `mem://features/*`):
   - Stage-as-Board (every status renders as a draggable board)
   - Views-are-Truth (index/detail pages read rollup views, never re-derive)
   - Every actionable carries 5 time fields + mounts `<TimeControls>`
   - Polymorphic Measures via `<MeasuresPanel>`
   - 8 BizzyBot Lenses are canon — never invent new ones
   - Sparks system-generated only, Tasks human/agent/workflow
   - Domains and Tenets are independent axes — never co-rendered as one chip group
   - Sidebar IA is locked at 7 groups
3. **Design language** — light-first SweetBot world, premium, luminous, dimensional, rounded precision, calm guided intelligence, semantic tokens only (no raw hex)
4. **Score rubric** — what 1–5 means for hierarchy, density, states-completeness, a11y, canon-adherence
5. **Required output schema** — the exact JSON tool-call contract the edge function expects (so the prompt has a fixed shape to target)
6. **Examples of good vs bad findings** — 3 concrete pairs so the LLM understands the tone (specific, actionable, references file:line, suggests the canonical fix)
7. **Anti-patterns to flag** — `as any`, raw hex, missing empty/loading/error states, status fields rendered as plain Selects when they should be boards, missing TimeControls on actionable detail pages, Domain+Tenet co-mingling
8. **What NOT to flag** — generic SaaS recommendations, "consider adding analytics", aesthetic taste preferences

You hand this file to your other LLM with the prompt: *"Write a single system prompt for the ux-audit edge function that satisfies all of this. Optimize for grounded, specific, file:line findings. Output only the system prompt."*

Then paste the result back to me and I drop it into `supabase/functions/ux-audit/index.ts` as the `SYSTEM_PROMPT` constant.

---

## Capturing the UX issues you've already seen

Since you mentioned there are real issues on specific pages: when I ship 2B I'll add a small **"Report issue on this page"** affordance to the topbar (only visible to you, controlled by an env flag). It writes a row to `ux_audit_runs` with `status='open'` and your text in `ux_issues_user_reported`, so the auditor picks them up on the next run and treats them as known signal rather than re-discovering them.

Faster than a dedicated bug tracker, lives in the same surface as the audit results.

---

## Order of operations (one pass)

1. Migration: `ux_audit_runs` + RLS
2. Edge function: `ux-audit` with a **placeholder** system prompt (good enough to test the wiring; your other LLM rewrites it after)
3. Cockpit route + audit card
4. Topbar "Report issue" affordance
5. Briefing pack written to `/mnt/documents/ux-auditor-briefing.md` for you to forward
6. Memory: new `mem://features/ux-auditor.md` documenting the loop

After this lands you'll have: a working auditor with a placeholder prompt, the briefing pack to share, and a way to report the UX issues you're seeing in real time. As soon as your other LLM returns the masterful prompt, I swap it in (one-line edit) and re-run the auditor against every sidebar route to get a baseline.

Then **Pass 3** (monster files) can use the auditor's baseline as the before-state and re-score the after-state.

---

## What this is NOT

- Not auto-running AI on page loads — manual click only
- Not deferring Pass 3 — that's next, and the auditor's baseline makes it measurable
- Not building a generic SaaS UX tool — it's grounded in your canon rules

Reply **"Run 2B"** and I'll ship the migration + edge function + cockpit + briefing pack in one pass. Or reply **"Briefing pack first"** if you'd rather get the doc to your other LLM today and have me build the auditor tomorrow with the polished prompt already in hand.

