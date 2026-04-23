

# Open Work Handoff — Everything Not Yet Done

A complete inventory of what's been planned/started but not closed, ranked by leverage. Take this anywhere to keep building.

---

## TIER 1 — Half-finished, will pay off immediately

### 1. Wave 21 — Lens System final wiring (highest leverage, mostly done)
Architecture and DB are live. SweetLens panel is mounted on 12 detail routes. **Still open:**

- **OCDA cockpit drop targets** — convert the 4 lanes (Observe / Decide / Act / Refine) into drag targets using the existing `useDragToStatus` hook. Union the Observe lane sources: `proposals + sparks + inbound_signals + kti_scans` (last 24h). Add an inline "Log decision" composer in Decide. Union running workflow runs into Act.
- **`<OCDAStageChip>` on more headers** — currently only on Task and Decision. Mount on Project, Spark, Quest detail headers.
- **FlowStrip** — top of `/capture`, `/sandbox`, `/queue` showing `Capture → Sandbox → Queue → Routed` with current step highlighted. Component file `src/components/flow-strip.tsx` may already exist; needs mounting.
- **Library "used by" chips** — on rows of `/library/jtbd`, `/library/ktis`, `/personas`, `/outcomes`, `/components`, `/playbooks`. New component `src/components/library/used-by-chip.tsx`.
- **Audit allow-list** — confirm `lens_outputs`, `open_decisions`, `decisions` are in the audit-log allow-list trigger.
- **Memory writes** — new `mem://design/lens-system.md` (3-layer model: Lens · Interrogation · Object Companion). Update `mem://design/lenses-bizzybots.md` to clarify BizzyBot = persona attribute, Framework = structure attribute.
- **Lens Wall structured-outputs footer** — append `<LensOutputsList>` to `lens-wall.tsx` and `lens-perspective-card.tsx` so Domain/Tenet pages get parity with the rail.

### 2. Wave 20 — Product Clarity leftovers
PageHeader contract (`purpose · whatYouCanDo · connectsTo · nextSteps`) still missing on these routes:
`/today`, `/operate/ocda`, `/flightdeck`, `/sweetscan`, `/calendar`, `/capture`, `/import`, `/sessions` index, `/operators/$id`, `/engagement-plans` index + detail.

### 3. Planning Workspace follow-ons
- **Quest Board** — `/planning/board` (or merge into `/sweetcycle`): rows = Quests, columns = `Discovery → Building → Shipping → Done`, drag to move state.
- **Flightdeck operator filter** — add a "you vs. dev" filter chip so each operator sees their own lane.
- **Thinking Room v2** — "Suggest candidates from this canvas" button (AI scan of Topic prose → proposed `?Quest` `?Decision` `?KPI` candidates). Deferred from the Thinking Room build.

---

## TIER 2 — Planned and approved, never finished

### 4. Pass 3 — Monster-file refactor + type-safety sweep (on hold by your call)
- Split 4 oversized files (>600 lines) into focused sub-modules with re-export shims.
- Eliminate remaining 14 `as any` casts.
- Generate a Developer Briefing Pack to `/mnt/documents/developer-briefing.md`.

### 5. Sparks → Components → Outcomes loop (still disconnected per audit #206)
- Wire spark dismissal/promotion to update Component evidence.
- Outcome auto-creation when a Quest containing promoted Sparks completes.
- "Angela" demo dataset never seeded — add `seed_demo_data.sql` so empty-state pages have realistic content for showing the dev.

### 6. UX Auditor — bulk execution + auto-fix loop
Built but underused. Still open:
- Scheduled run (cron edge function) auditing all routes nightly.
- Auto-PR-style proposal: for each finding, generate a suggested code patch as a Spark.

---

## TIER 3 — Mentioned but never planned in detail

### 7. Cash flow / monetization plumbing (you raised this — never built)
- A "Money" entity or measure pattern to track revenue, expenses, runway.
- Pricing / package definitions tied to `service_shape` (Mirror / M+M / Machine / Map).
- Proposal → Invoice → Payment lifecycle (no payment provider connected yet — Stripe or Paddle).

### 8. Service offering language (you raised this — never built)
- Canonical "Service Definition" object with: name, who-it's-for, outcome, deliverables, price, package shape.
- Public-facing service page generator (`/p/$slug`).

### 9. What-to-track KPI dashboard (you raised this — never built)
- A KPI cockpit reading from `measures` + `measure_health` view.
- Leading vs lagging indicator distinction on the measure record.
- Alerting when a KPI crosses threshold (likely tied to KTI scans).

### 10. Realtime collaboration
- Supabase Realtime is available but not wired anywhere. Adding it to `tasks`, `decisions`, and `thinking_items` would let you and your dev work in the same Topic simultaneously.

### 11. Mobile / responsive pass
Never audited. Most surfaces assume desktop. Capture and Today are the priority for phone use.

---

## TIER 4 — Strategic / design-thinking, no implementation yet

- **Onboarding flow** for new users (or your dev) — guided "your first Quest" walkthrough.
- **Permissions / multi-tenancy** — currently single-workspace; if you bring on clients, each needs isolated data.
- **Public client portal** (`/p/$slug`) is scaffolded but minimal. Needs auth, threaded comments, deliverable approval.
- **Email digest** — daily "what changed" summary using the `entity_audit_log`.
- **AI agent autonomy levels** — operators table supports agents but no agent actually runs autonomously yet.

---

## How to use this list elsewhere

1. **Copy this whole plan** into a Notion / doc as your roadmap.
2. **Tier 1 first** — each item is < 1 day for a competent dev and unlocks visible product value.
3. **Tier 2** is technical health — schedule a "cleanup week" before scaling.
4. **Tier 3** is your real business questions (cash flow, services, KPIs). Use the Thinking Room to draft them, then promote to Quests when ready.
5. **Tier 4** is post-MVP — don't touch until you have 3+ paying users.

Each item references the file paths and component names already in the codebase, so any developer (or a future Lovable session) can pick it up cold.

