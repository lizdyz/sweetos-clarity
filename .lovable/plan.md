

# Reset against Master Guide v4 + Blue Notebook — corrections, KTI build, and what comes next

You were right to push back. The previous merge attempt blurred two distinct things. Master Guide v4 settles the architecture; the Blue Notebook adds new concepts (KTI chief among them). This plan does three jobs: **(1) correct the canon I got wrong, (2) build KTI as a first-class entity wired into SweetScan, (3) park everything else in clearly-labeled sandboxes so nothing else slips into canon by accident.**

---

## Part 1 — Canon corrections (memory only, no code)

Things v4 says explicitly that contradict what I previously wrote or merged:

| Thing | What I had wrong | What v4 says |
|---|---|---|
| **Co-Evolution vs SweetCycle** | Treated them as the same flywheel | **Different objects.** Co-Evolution (Explore/Exploit → Attune → Integrate → Recalibrate) is a **Lens** in the Queryable Layers list — it's a way to interrogate objects, not a workflow. SweetCycle (Seed → Synthesize → Session → Sync → Ship) is the **Session progression path**. Never conflate. |
| **The core object** | Treated Map/Machine/SweetSync as parallel product universes | They are **delivery variations of one underlying workflow/capability**. Workflow is the core; the three are how it's delivered. |
| **Two progression paths** | Implied one funnel | There are **two**: Session path (Evidence → Judgment → Decision) and SweetSync path (Decomposition into Journey → Quest → Spark). Both write to the same truth model. |
| **Mission** | Treated as top-down only | v4: Mission can be **self-defined** (cascades down) OR **emergent** (bubbles up from Spark evidence via Liz). Both are valid. |
| **Confidence** | Implicit | v4 names **four levels**: Not Yet Verified · Inferred · Observed · Verified · (Confirmed = highest, cross-source). Belongs as a first-class field on captured answers. |
| **Story Trail** | Treated as analytics-adjacent | v4: explicitly NOT analytics. It is the **narrative audit trail** — what changed, what was decided, what was learned. Different surface, different job. |
| **Living thresholds** | Treated maturity bars as fixed | v4: thresholds are **current best understanding**, must be updatable as evidence improves. |

**Memory updates (no code):**
1. New `mem://design/co-evolution-vs-sweetcycle.md` — hard separation rule
2. New `mem://design/core-object-and-variations.md` — workflow is the core; Map/Machine/SweetSync are variations
3. New `mem://design/two-progression-paths.md` — Session path vs SweetSync path; both write to one truth model
4. Update `mem://features/sweetcycle-journey.md` — add note: "Co-Evolution is a Lens, not a journey stage."
5. Update `mem://design/lenses-bizzybots.md` — confirm Co-Evolution belongs in the 9-lens queryable layer list
6. Update `mem://index.md` — Core rules: add the four corrections above as one-liners
7. Append to `/mnt/documents/sweetbos-marketing-alignment.md` — "Architecture corrections" section so the marketing voice reflects v4

---

## Part 2 — KTI as a first-class entity (the actual build)

This is the new thing the notebook surfaced. Built per your spec, wired into the existing Signal Scanner surface (which is what "SweetScan" maps to in the codebase today).

### Database (one migration)

```sql
CREATE TYPE kti_trigger_action AS ENUM ('task','bot_alert','flightdeck_flag','all');
CREATE TYPE kti_scan_frequency AS ENUM ('daily','weekly','monthly');
CREATE TYPE kti_status AS ENUM ('active','paused','fired');
CREATE TYPE kti_direction AS ENUM ('up','down','flat','fired','unknown');

CREATE TABLE public.key_trend_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  domain_id uuid REFERENCES public.domains(id) ON DELETE SET NULL,
  owner_operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  threshold_definition text NOT NULL,
  trigger_action kti_trigger_action NOT NULL DEFAULT 'bot_alert',
  scan_frequency kti_scan_frequency NOT NULL DEFAULT 'weekly',
  status kti_status NOT NULL DEFAULT 'active',
  relationship_id uuid REFERENCES public.relationships(id) ON DELETE CASCADE, -- NULL = universal
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.kti_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kti_id uuid NOT NULL REFERENCES public.key_trend_indicators(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  observed_value text,           -- free-form: "rising", "0.42", "3 mentions"
  direction kti_direction NOT NULL DEFAULT 'unknown',
  fired boolean NOT NULL DEFAULT false,
  evidence jsonb,                -- raw signal payload
  notes text
);

CREATE INDEX ON public.kti_scans (kti_id, scanned_at DESC);
```

RLS: team-member read/write via existing `is_team_member()`. Triggers: `set_updated_at`. When `kti_scans.fired = true`, parent KTI flips to `status='fired'`.

### UI — three surfaces

1. **`/library/ktis` index** (under Library sidebar group, sibling to Lens Library and JTBD)
   - Filters: scope (universal vs per-relationship), status, direction
   - Each row: name · domain chip · owner chip · last scan + direction arrow · cadence · status pill
   - "New KTI" form

2. **`<KtiPanel relationshipId={id|null}>` component** — the radar
   - Mounts inside the existing Signal Scanner surface (`SignalScannerConfig` → renamed conceptually to "SweetScan")
   - Header: "Forward radar — what we're watching"
   - Grid of KTI tiles, each showing: name, last scan timestamp, direction glyph (↑ ↓ → 🔥), threshold one-liner
   - Click tile → drawer with scan history sparkline + "Run scan now" button
   - Empty state: "No KTIs configured. Add one to start watching."

3. **Detail page `/library/ktis/$id`**
   - `<TimeControls>` mounted (per canon)
   - `<CanonGuardrail entityKind="kti" />` mounted
   - Scan history table + "Trigger action history" (every fire → what it spawned)

### Where it appears beyond Library

- **Domain detail page** — embed `<KtiPanel domainId={...} />` showing KTIs filtered to that domain
- **Relationship detail page** — embed `<KtiPanel relationshipId={...} />` showing universal + client-specific KTIs
- **Flightdeck row** — count of fired KTIs as a column

### Wiring to existing scan-signals edge function

The existing `scan-signals` edge function gets a new mode:
- `mode: 'rubric'` (today's behavior — proposes Excellence checklist items)
- `mode: 'kti'` (new — evaluates a KTI's threshold against fresh signals, writes a `kti_scans` row, sets direction + fired)

Cron via `pg_cron` + `pg_net` posts to `/api/public/hooks/scan-ktis` daily/weekly/monthly based on each KTI's `scan_frequency`.

### What KTI is NOT (preventing future drift)

- Not a Measure. Measures are backward-looking (Objective/KR/KPI/CSF) attached to a subject. KTIs are forward-looking signal trackers attached to a domain (and optionally a relationship). They live in different tables, render in different panels.
- Not a Spark. Sparks are atomic interactions inside Quests. A KTI fire can *spawn* a Spark or Task, but the KTI itself is not one.
- Not a Lens. Lenses interrogate existing objects. KTIs watch the outside world.

### Memory
- New `mem://features/ktis.md` — entity definition, what it is/isn't, panel mount points, fire→action flow
- Add to `mem://index.md` Core: "KTIs are forward-facing signal trackers — never confuse with KPIs (backward) or Sparks (atomic)."

---

## Part 3 — Sandbox everything else from the Blue Notebook

These are documented but **not built**. One short file per item under `mem://sandbox/`:

| Concept | Sandbox file | Why parked |
|---|---|---|
| Aperture points | `mem://sandbox/aperture-points.md` | Conceptual frame for what KTIs filter for; absorb into KTI docs once we see usage |
| Behavior pattern loop (5 parts) | `mem://sandbox/behavior-loop-5.md` | Need to decide: advisor rhythm vs client cycle |
| BizzyBot capability spec (6 cards) | `mem://sandbox/bizzybot-capability-spec.md` | Will inform future BizzyBot prompt updates, not a build today |
| Persona rules R1–R5 | `mem://sandbox/persona-rules.md` | Real but needs decision: enforce as DB constraints (R1 NOT NULL jtbd_id) or only as auditor presence checks |
| Decision Influencer journey (13th?) | `mem://sandbox/decision-influencer-journey.md` | Open question, not adding to Journey taxonomy yet |
| PCP, Childhood scripts, Identity/commitment, X/Y model, FATE, President/Professor/Artist | one file each | Psychology layer, not yet ready to formalize |
| Artifact KPIs / quality standard | `mem://sandbox/artifact-quality-standard.md` | Needs design before build |
| SweetBOS Guide to the Galaxy | `mem://sandbox/guide-to-the-galaxy.md` | Creative piece, not architecture |

Plus: append `/mnt/documents/sweetbos-marketing-alignment.md` "Notebook voice" section with the recognition-test, unreasonable-hospitality, "show them the map", and "context before content" lines as ready-to-use copy with provenance.

---

## Files this plan touches

**Migration (1):**
- `supabase/migrations/<ts>_ktis.sql` — types, two tables, RLS, trigger

**Edge function (1):**
- `supabase/functions/scan-signals/index.ts` — add `mode: 'kti'` branch

**New routes (2):**
- `src/routes/_app.library.ktis.tsx` — index
- `src/routes/_app.library.ktis.$id.tsx` — detail

**New components (2):**
- `src/components/kti-panel.tsx` — the radar (relationship/domain/global modes)
- `src/components/kti-form.tsx` — create/edit

**Touched components/routes (4):**
- `src/components/app-sidebar.tsx` — add "KTIs" under Library
- `src/routes/_app.domains.$slug.tsx` — embed `<KtiPanel domainId={id} />`
- `src/routes/_app.relationships.$id.tsx` — embed `<KtiPanel relationshipId={id} />`
- `src/components/signal-scanner-config.tsx` — add a "Forward radar" tab alongside the existing rubric scanner

**New API route (1):**
- `src/routes/api/public/hooks/scan-ktis.ts` — cron entry point

**Memory (~20 files):**
- 3 new design canon files (Part 1)
- 1 new feature file (KTI)
- ~12 new sandbox files (Part 3)
- Update `mem://index.md`, `sweetcycle-journey.md`, `lenses-bizzybots.md`
- Append marketing-alignment doc

---

## What this plan is NOT

- Not building any of the sandbox items (PCP, Persona rules, Behavior loop, etc.)
- Not touching the Co-Evolution lens beyond clarifying its place in the Queryable Layers list
- Not redesigning Story Trail (canon now corrected; build untouched)
- Not adding a "Confidence" field to captured answers yet — that's a Part 4 to plan separately once you confirm the canon correction lands cleanly
- Not enforcing Persona R1 (`jtbd_id` NOT NULL) yet — it's in sandbox until you decide

---

## After this lands

You'll have: (a) a corrected canon that no longer conflates Co-Evolution with SweetCycle or treats Map/Machine/SweetSync as separate universes, (b) a working KTI entity wired into Library, Domain pages, Relationship pages, and the Signal Scanner surface as a forward radar, (c) every other Blue Notebook concept saved in sandbox so we don't lose them and don't accidentally promote them to canon.

Reply **"Run the reset + KTI build"** to ship Parts 1, 2, and 3 in one pass. Or split — say **"Just Part 1"** to land canon corrections first, then approve KTI separately.

