

# The Idea Sandbox: triage surface + universal "Triageable" interface across entities

You corrected two things at once:

1. **Decision Factory has a precise meaning** (from your Apr 18 notebook, confirmed by the image you uploaded): it's the *thing OCDA makes systematic* — a four-component machine: **Data Pipeline → Algorithms → Experimentation Platform → Infrastructure**. It's **not** a 5-lane Kanban I invented. OCDA Cockpit is already where it lives. I should restore that meaning, not replace OCDA.

2. **What you actually want me to build** is upstream of OCDA: an **Idea Sandbox** where raw inputs (signals, fires, captures, sparks, half-baked thoughts) land in one place, can be **poked at with framework overlays** (BizzyBots / Lenses / 5Ps / KTI logic), and then **promoted** into the right kind of work — task, project, decision input, spark, or simply archived. With **shared mechanics** so every triageable thing behaves the same way.

This plan does three things, in order.

---

## Part 1 — Restore Decision Factory to its real meaning (small, important fix)

Per the notebook: **Decision Factory = the four-component decisioning machine that OCDA operationalizes.** The four components live as canon:

| # | Component | What it does |
|---|---|---|
| 01 | **Data pipeline** | Semi-automated process that gathers, cleans, integrates, and safeguards data in a systematic, sustainable, scalable way |
| 02 | **Algorithms** | Generates predictions of future states and actions of a business — not reports, predictions |
| 03 | **Experimentation platform** | Hypotheses on new approaches are tested. Confirms whether suggestions are having their intended effect |
| 04 | **Infrastructure** | Embeds this process into software. Connects internal and external users. What makes it compound rather than reset. |

**What I'll do:**
- Rename the OCDA route header from "OCDA Cockpit" to **"OCDA — your Decision Factory"** with a one-line explainer ("Observe · Choose · Decide · Act — the loop that makes your Decision Factory compound")
- Add a small **Factory Health strip** at the top of `/operate/ocda` showing the four components as status tiles (Data pipeline / Algorithms / Experimentation / Infrastructure) — each links to where that component is built (Data pipeline → SweetScan + Capture; Algorithms → KTIs + BizzyBots; Experimentation → Workflows; Infrastructure → the OS itself)
- Save canon: `mem://design/decision-factory.md` with the verbatim 4-component definition + "OCDA is the Decision Factory made personal" + the anti-EBITDA argument
- I'm **not** ripping out the existing 4-column OCDA cockpit (Observe/Choose/Decide/Act) — that's correct. I'm just re-framing it and adding the health strip

That closes the misunderstanding cleanly without overbuilding.

---

## Part 2 — The Idea Sandbox (the real ask)

A new triage surface that answers: *"Stuff is coming at me — signals, fires, podcasts, half-thoughts, sparks. What is it? What overlay should I run on it? What should it become?"*

### 2A. Where it lives

**New route: `/sandbox`** in the **Think** sidebar group (sits between Capture and SweetScan). Capture remains the *input port*; Sandbox is the *triage table*.

```text
Capture (port) → Sandbox (triage) → {Task | Project | Spark | Decision input | Component canon | Archive}
                  ↑
                  also pulls in: KTI fires · inbound_signals · open sparks ·
                                 capture proposals · session "open questions"
```

### 2B. What you see on `/sandbox`

A single board with **three lanes**, plus a **frameworks rail** on the right:

1. **Raw** — anything that hasn't been classified yet (new captures, fresh KTI fires, untriaged inbound signals)
2. **Framed** — items where you (or AI) added a question, a lens, or a tag — but no decision yet about what they become
3. **Routed** — items that have been promoted (with a link chip showing what they became + when)

Each card shows: title · source chip (where it came from) · age · confidence · current frame (if any) · "Promote to…" button.

### 2C. The frameworks rail (the "ask overlays" you described)

Right side of `/sandbox`. Pick one or more overlays and **drop a card on it** (or click the overlay while a card is selected) to run that lens:

| Overlay | What it does to the selected idea |
|---|---|
| **5Ps** | Tags which Ps it touches (Purpose/People/Process/Product/Profit), surfaces gaps |
| **BizzyBot lens (F1–F8)** | Generates a perspective using the chosen lens — pros, cons, what to ask next |
| **KTI candidate** | Asks "could this become a forward-looking indicator?" → drafts a KTI definition |
| **Domain/Tenet fit** | Maps the idea to the 22 domains + your active tenets; shows nearest matches |
| **Decision-readiness** | Asks the four "ready to decide?" gates: framed question? options weighed? evidence attached? confidence level set? |
| **Operational alpha test** | Asks "if we did this, where does it compound? where does it leak?" (per your Op Alpha definition) |

Output of any overlay attaches to the card as a **frame** — visible on the card, searchable, and carried through if/when the card is promoted.

### 2D. Promote actions (the "spawn off" part)

From any card, one click:

- **→ Task** — creates a task with `spawned_by_kind='sandbox'`, `spawned_by_id=<sandbox_item_id>`, prefilled name + linked source
- **→ Project** — creates a project with the idea as the brief; carries forward all attached frames
- **→ Spark** — converts to a spark (system-attributed) under the matched component
- **→ Decision input** — adds it to the OCDA "Observe" column with its frames as evidence
- **→ Component canon** — appends to a component's brand canon / playbook (with diff preview)
- **→ Archive** — soft-delete with reason ("not now", "duplicate", "out of scope")

Every promote writes provenance both ways (sandbox item → spawned thing, AND spawned thing → originating sandbox item).

### 2E. Schema

One new table (mostly a typed view over what already flows in):

```sql
sandbox_items (
  id uuid pk,
  source_kind enum: capture · kti_fire · inbound_signal · spark · session_question · manual,
  source_id uuid,                 -- FK to original record (nullable for manual)
  title text,
  body text,
  state enum: raw · framed · routed · archived,
  frames jsonb,                   -- array of {overlay_kind, output, ran_at}
  routed_to_kind enum: task · project · spark · decision_input · component_canon · archive,
  routed_to_id uuid,
  routed_at timestamptz,
  created_by, created_at, updated_at
)
```

Plus a SQL view `sandbox_inbox` that **auto-unions** new captures + fresh KTI fires + un-routed inbound_signals so the Raw lane is always live without manual inserts.

### 2F. Capture stays the input port

Capture page gets a small footer: **"All captures land in your Sandbox"** with a link. We don't change Capture's UI. We just stop pretending Capture is the triage surface — it isn't, and it shouldn't be.

---

## Part 3 — Commonality across entities (the "manipulate them in similar but different ways" part)

This is the deep part of your message and the most leveraged. Today, every entity has its own ad-hoc way of being acted on. You want a **shared interface**.

### 3A. The `Triageable` shape

A common TypeScript interface + a common UI pattern for any entity that can be poked at:

```typescript
interface Triageable {
  id: string;
  kind: "sandbox_item" | "spark" | "kti" | "task" | "decision_input" | "inbound_signal";
  title: string;
  source: { kind: string; id: string; label: string };
  state: "raw" | "framed" | "routed" | "archived" | "active";
  frames: Frame[];                  // overlay outputs attached
  promote_options: PromoteAction[]; // what you can convert it into
  provenance: { upstream: Ref[]; downstream: Ref[] };
}
```

### 3B. Two reusable components built once, mounted everywhere

- **`<TriageCard item={triageable} />`** — the universal card UI: title, source chip, frame chips, age, primary "Promote" button. Used in `/sandbox`, the Sparks page, the Tasks "Next up" lane, the SweetScan inbox, OCDA Observe lane.
- **`<FrameworksRail target={triageable} overlays={[...]} />`** — the right-side rail with overlay buttons. Mountable on any detail page (Task, Spark, KTI, Decision draft, Sandbox card). Same overlay set, same behavior, same output shape.

**Result:** the gesture "select item → run overlay → see frame → promote" feels identical across the OS, even though the underlying entity differs. That's the commonality you asked for.

### 3C. Sandbox surfaces show up wherever they're useful

- **Today page** — small "Sandbox: 6 raw, 2 framed" tile linking in
- **Relationship detail** — Sandbox tab filtered to that client's items
- **Domain detail** — Sandbox tab filtered to that domain
- **OCDA "Observe" column** — already shows captures + sparks; now also shows un-routed Sandbox items tagged for decision

---

## Files this plan touches

**Decision Factory restoration (Part 1) — 2 files**
- `src/routes/_app.operate.ocda.tsx` — rename header, add 4-tile Factory Health strip
- `mem://design/decision-factory.md` (new) — verbatim 4-component canon from notebook

**Idea Sandbox (Part 2) — 5 files + 1 migration**
- `supabase/migrations/<ts>_sandbox_items.sql` — `sandbox_items` table, `sandbox_inbox` view, RLS, `set_updated_at` trigger
- `src/routes/_app.sandbox.tsx` (new) — three-lane board + frameworks rail
- `src/components/sandbox-board.tsx` (new) — Raw/Framed/Routed lanes with `<TriageCard>`
- `src/components/sidebar-nav.tsx` — add "Sandbox" entry under Think
- `src/routes/_app.capture.tsx` — add "→ All captures land in your Sandbox" footer link

**Commonality / shared interface (Part 3) — 4 files**
- `src/lib/triageable.ts` (new) — `Triageable` interface, overlay registry, promote action types
- `src/components/triage-card.tsx` (new) — universal card UI
- `src/components/frameworks-rail.tsx` (new) — overlay rail (5Ps · F1–F8 · KTI candidate · Domain/Tenet fit · Decision-readiness · Op Alpha)
- `src/routes/_app.today.tsx` — add Sandbox status tile

**Memory (3 files)**
- `mem://design/decision-factory.md` (new — Part 1)
- `mem://design/idea-sandbox.md` (new) — Sandbox is the triage layer; lives in Think; promotes to {task, project, spark, decision input, component canon, archive}; provenance always preserved
- `mem://design/triageable-interface.md` (new) — shared `Triageable` shape; `<TriageCard>` + `<FrameworksRail>` mount on any qualifying entity; same gesture across the OS

---

## What this plan is NOT

- **Not** replacing OCDA Cockpit — restoring its meaning, adding a 4-tile health strip, that's it
- **Not** building auto-promotion — every promote is a human click; AI only suggests
- **Not** changing Capture's UI — Capture stays the input port; Sandbox is the triage surface
- **Not** building all 6 overlays in one go — ships with **5Ps · BizzyBot lens · KTI candidate · Domain/Tenet fit** in v1; Decision-readiness + Op Alpha in v2
- **Not** retrofitting `<TriageCard>` everywhere at once — built once, mounted in `/sandbox` first, then on the Sparks index and the SweetScan inbox in v1.5

---

## After this lands

1. OCDA Cockpit correctly explains itself as "your Decision Factory made personal" with the four canon components visible and linked to where they're built
2. `/sandbox` becomes the triage table — every fire, capture, spark, and inbound signal lands there in the **Raw** lane; you run an overlay (5Ps, a BizzyBot lens, KTI candidate, domain fit) which moves it to **Framed**; one click promotes it to a Task / Project / Spark / Decision input / Component canon update / Archive — and the **Routed** lane shows what became of it with full provenance
3. The same `<TriageCard>` + `<FrameworksRail>` gesture works across Sandbox, Sparks, the SweetScan inbox, and the OCDA Observe lane — different entities, identical mechanics

Reply **"Run all three"** to ship Parts 1, 2, and 3. Or split: **"Just Part 1"** to fix the Decision Factory framing first, then approve Sandbox separately. Or push back if Sandbox isn't quite the shape you meant — happy to re-plan.

