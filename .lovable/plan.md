

# Reconciling v1 (UX restructure) and v2 (operator platform) — one forward path

## What you handed me

Two architectural briefs that **don't conflict**. v2 explicitly says v1 is "incomplete, not wrong" and stacks on top of it.

- **v1** optimizes for *Liz's day*: signal-first Today, walkable graph, mode anchoring, 4-group rail, 6 surfaces that carry 80% of the load.
- **v2** reframes the same app as *SweetBot Inc.'s operator platform*: clients are managed entities, operators (human + workflow + agent) are first-class, and four new capabilities (Operator Dashboard · Handoff · Canon · Onboarding Quest) are what's actually missing.

The right move is **not to pick one**. It's to **merge them with v2's priority order** and ship in the sequence v2 already laid out, while applying v1's universal patterns (walk-menu, connection rail, universal detail shell) to every new surface as we build it.

---

## The reconciled plan — five waves

### Wave 1 · Sidebar IA + topbar shell (foundation for everything below)

Without this, every later wave fights the rail. Small, pure UI, no schema.

- Collapse 8 groups → **TODAY · WORK · PEOPLE** + collapsed **Canon · Library · Settings**
- Promote **Operators** to first item in PEOPLE (v2 rule)
- Move Sandbox out of Think into WORK; absorb OCDA Cockpit as a Flightdeck view toggle; move BizzyBots, Documents, Domain Assessments behind Library; move Missions/Journeys/Quests/Sparks onto the Relationship detail page (still reachable via Library index)
- Add **Mode switcher** (Operate · Engage · Build) sticky above TODAY
- Topbar gets: Search (⌘K), Quick Capture, mode indicator, **entity crumb trail (5 deep)**, bot alerts bell, profile
- Update `mem://design/sidebar-ia.md` to the new IA so it's canon

**Risk:** zero — route paths don't move, only sidebar grouping changes.

### Wave 2 · Operator Dashboard (v2 priority #1)

The single highest-leverage build in v2. `/operators/$id` exists but renders like a profile.

- Rebuild with: header → **Capacity strip** (reads `operator_workload`) → **six-tab queue** (Now · Queue · Blocked · Awaiting · Handoffs · History) → measures panel → agent-canon block (agents only)
- Rebuild `/operators` index as **capacity-visible grid** (one tile per operator with live counts)
- Every row in every tab uses v1's universal **walk-menu** (Up · Down · Produces · Consumes · Advances · About) — built as a reusable component now so all later waves get it
- Handoffs tab renders empty placeholder until Wave 3

### Wave 3 · Handoff mechanism (v2 priority #2)

What makes the EA hire actually work.

- New `handoff_events` table (additive, no breaking change): `work_item_kind`, `work_item_id`, `from_operator_id`, `to_operator_id`, `brief`, `attached_context jsonb`, `status` (sent/accepted/bounced/completed), `gate_type`, `bounce_reason`
- **Handoff sheet** — slide-in from right on any work item (task, project, session, workflow run). Auto-attaches relationship + component + execution_prompt + success_criteria from the item; lets sender pick optional sessions/decisions to include
- Writes a `handoff` event to `entity_audit_log` on send
- Handoffs tab in Operator Dashboard surfaces inbound with **Accept / Bounce-back** actions
- Bounce-back returns to sender's Handoffs tab with reason — surfaces canon gaps as data

### Wave 4 · Today as a decision surface (v1 priority — now ready, since Operator Dashboard handles "my plate")

Today stops trying to *be* the operator dashboard and becomes the **signal + decision surface**.

- **Decision bar** (top): four chips — Awaiting you · Ready to advance · Fired in last 24h · Stuck > 3 days
- **Next best actions column** — computed top-5, each with inline Do / Schedule / **Hand off** action (uses Wave 3 sheet)
- **Live signal strip** — SweetScan forward radar preview (KTI fires + classified inbound signals)
- Today's scheduled work (existing) + Story trail (existing) below
- SweetScan moves from rail item to Today tab (per v1 §3.1, v2 keeps SweetScan as page — recommend Today tab; flagging for your call)

### Wave 5 · Platform Canon room (v2 priority #3)

Wisdom's home. Evaluator's home.

- New `/canon` route, seven tabs: Overview · Vocabulary · Entities · ERD · Decisions · Ship status · Evidence · Forks
- ERD tab: auto-rendered from live schema (mermaid from `pg_catalog`), click table → columns + which routes read it (cross-reference already computed in your audit doc)
- Vocabulary + Entities: read views over `entity_canon` / `lens_canon`; edit stays in Settings
- Decisions: combined `decisions` + `open_decisions` with supersedes chain
- Ship status: hand-maintained table v1, machine-checkable v2 later

### Wave 6 (deferred, content not code) · Onboarding Quest (v2 priority #4)

Pure content work on existing Quest/Spark primitives. One enum addition (`quest.kind = 'onboarding'`), then write the 10 EA Sparks. Defer until Waves 1–5 land — they're what makes the Quest's Sparks resolvable.

---

## The cross-cutting features (apply to every wave as it ships)

These are v1's load-bearing patterns. We don't build them as a wave — we build them once, then mount them into every surface above.

| Feature | First built in | Reused in |
|---|---|---|
| **Walk-menu** (Up/Down/Produces/Consumes/Advances/About) | Wave 2 (Operator Dashboard cards) | Today, Flightdeck, Relationship detail, Work, Sandbox |
| **Universal detail shell** (canonical header → work-context strip → connection rail + content → evidence footer) | Wave 2 (`/operators/$id` is the proof) | Every detail page; extend `entity-workspace`, don't fork |
| **Topbar entity crumb trail (5-deep)** | Wave 1 | Persists across all navigation |
| **Connection rail** on detail pages | Wave 2 | Component, Workflow, Session, Task, Project detail |
| **Maturity overlay** (L-dot on every Component card, ring on Relationship card) | Wave 4 | Anywhere a Component or Relationship renders |

---

## Open questions I need you to call before I start Wave 1

These are v1's §9 plus one new from v2:

1. **Mode switcher — ship in Wave 1, or defer until 3+ operators are live?** v2 implies it's overkill at 2 operators (you + Wisdom). Recommend: **build it, default to Operate, hide the picker until a 3rd operator joins**.
2. **SweetScan — Today tab (v1) or keep as standalone page (v2 implies)?** Recommend: **Today tab** for the radar preview, keep `/sweetscan` page for the deeper inbox/world-watch view. Both surfaces, same data.
3. **Sandbox count badge in rail** — show always or only when > 0? Recommend: only when > 0, color amber if any item is `framed > 3 days`.
4. **Canon as its own collapsed top-level group, or under Library?** v2 says its own (so Wisdom doesn't feel he's in admin). Recommend: **own collapsed group** above Library.
5. **Fork 1 (Work Item merge) — close it before Wave 4?** Wave 4 spec works either way but is cleaner if decided. No need to block; flagging.

If you don't call them, I'll go with my recommended defaults above.

---

## What I am NOT doing

- Not breaking the database canon — all changes additive
- Not touching `routeTree.gen.ts` or any auto-generated file
- Not building Onboarding Quest content in code (Wave 6 is content authoring, separate from build)
- Not changing route paths — only sidebar grouping moves in Wave 1
- Not building visual design polish — IA + behavior first, visual second

---

## Sequencing summary

```text
Wave 1  Sidebar + topbar + mode switcher        (UI only, ~1 day)
Wave 2  Operator Dashboard + walk-menu + shell  (UI + 1 reusable lib)
Wave 3  Handoff sheet + handoff_events table    (1 migration + UI)
Wave 4  Today as decision surface               (UI; depends on Wave 2-3)
Wave 5  /canon route                            (UI + auto-ERD generation)
Wave 6  Onboarding Quest (content authoring)    (deferred)
```

After Wave 5: SweetBOS reads as the operator platform v2 describes, with v1's signal-first Today and walkable graph baked into every surface.

**Reply with one of:**
- **"Run Wave 1"** — ship the IA shift first, see it land, then approve Wave 2 separately
- **"Run Waves 1 + 2"** — ship the foundation and the highest-leverage v2 build together
- **"Run all five (1–5), defer Wave 6"** — full reconciliation in one push
- Or push back / answer the 5 open questions and I'll re-sequence

