

# Wave 19 — Audit Trail: a real system-of-record review surface

Story Trail stays as the narrative read. This wave adds a **formal, system-wide audit log** with its own home, designed for operational review, security oversight, and compliance traceability. We build on the existing `entity_audit_log` table — extend it with the missing fields, write to it consistently from every meaningful action, and ship a dedicated review console.

## Where it lives

New top-level entry under the **Settings** group: **Audit Trail** at `/audit`. Settings is the right home — it's where compliance-minded operators already look for governance surfaces (Canon, Excellence, Prompts, UX Audit). The audit page itself is full-bleed, not nested in the Settings tab strip, because review sessions need the full viewport.

A small **"View in audit"** chip is added to every existing `<EvidenceFooter>` and `<AuditTrailPanel>` so per-entity histories deep-link into the global console pre-filtered to that subject.

## Story Trail vs Audit Trail — clear separation

| | Story Trail | Audit Trail |
|---|---|---|
| Purpose | Narrative read of progress | System-of-record of changes |
| Sources | sparks + outputs + decisions + filtered audit | `entity_audit_log` only |
| Tone | Iris pulses, emerald checks, story beats | Dense table, monospace IDs, diffs |
| Audience | Operators reviewing momentum | Compliance / security / ops review |
| Filtering | None — chronological story | Heavy filter rail, click-to-filter chips |
| Detail | Beat title + chip | Full diff, actor, source, related run |

Story Trail keeps its current home (bottom of detail pages, top of `/today`). Nothing about it changes.

## Schema — extend `entity_audit_log`, don't replace it

The existing table already has the right shape (subject_kind, subject_id, field, old_value, new_value, change_type, source, operator_id, agent_run_id, model, notes, created_at, created_by). One migration adds the columns that make it a real audit surface:

```sql
alter table entity_audit_log add column
  event_category    text not null default 'data_change'
    check (event_category in (
      'data_change','lifecycle','tag_change','relationship_change',
      'import','schema','recipe','workflow','prompt','review','exception','auth'
    )),
  severity          text not null default 'info'
    check (severity in ('info','notice','warning','error','critical')),
  source_run_kind   text,                 -- 'workflow_run' | 'ingestion_run' | 'lens_run' | 'curator_run' | null
  source_run_id     uuid,                 -- the run id within that kind
  ip_address        inet,                 -- captured for human actions where available
  user_agent        text,
  diff              jsonb,                -- optional pre-computed structural diff for nested fields
  tags              text[] default '{}',  -- free-form tag array (e.g. ['pii','schema-evo'])
  request_id        text;                 -- correlation id across multi-step actions

create index idx_audit_category_time on entity_audit_log(event_category, created_at desc);
create index idx_audit_severity_time on entity_audit_log(severity, created_at desc);
create index idx_audit_actor_time    on entity_audit_log(created_by, created_at desc);
create index idx_audit_source_run    on entity_audit_log(source_run_kind, source_run_id);
```

A view `audit_events_enriched` joins in actor display name (from `profiles`), operator name (from `operators`), and a denormalized `subject_label` (best-effort name lookup per `subject_kind`) so the UI doesn't fan out N+1 queries.

RLS is already on the table (team read / team insert). Add: only admins can `delete` (they shouldn't, but the policy makes intent explicit), and an immutability trigger that blocks `UPDATE` on any row — audit events are append-only.

## Writing to the log — make it consistent

Today writes are ad-hoc (a few edge functions and the frameworks rail). This wave adds a **single helper** every server function and trigger calls:

```ts
// src/lib/audit.ts (client-safe types) + src/utils/audit.server.ts (writer)
export async function logAuditEvent({
  subjectKind, subjectId, field, oldValue, newValue,
  changeType, eventCategory, severity = 'info',
  source, operatorId, agentRunId, model,
  sourceRunKind, sourceRunId, notes, tags, requestId,
}: AuditEventInput): Promise<void>
```

Wired into:

- **Generic CRUD trigger**: a new pg trigger on a curated allow-list of tables (components, journeys, quests, missions, tasks, projects, decisions, sessions, workflows, operators, relationships, engagement_plans, sparks) writes a row on INSERT/UPDATE/DELETE. UPDATE rows include only changed columns (one row per changed field) so diffs are queryable. Excluded fields (`updated_at`, view-only computed cols) are configured per table in a small `audit_field_blacklist` table.
- **Ingestion**: every approved mapping, conflict resolution, schema suggestion approval, recipe save/apply writes an audit row with `source_run_kind='ingestion_run'`.
- **Workflows**: each `workflow_step_run` state transition writes an audit row with `source_run_kind='workflow_run'`.
- **Prompts**: any `generate-*` edge function execution writes one row with `event_category='prompt'`, `model`, and the prompt key in `notes`.
- **Auth**: a daily cron-style server fn pulls `auth.audit_log_entries` (or equivalent) and mirrors meaningful events (sign-in, password change, role grant) into our log so the audit console is a single pane.

Important: writes are best-effort and never block the originating action — failures log to console and surface as a dedicated `audit_write_failures` table (visible to admins as a "writer health" strip on the audit console).

## The console (`/audit`)

```text
┌── Filter rail (sticky left, 280px) ─┬── Results pane ───────────────────────┐
│                                      │                                       │
│  Date range                          │  Header strip:                        │
│  [last 24h ▾]                        │   847 events · 12 actors · 3 warnings │
│                                      │   [export csv] [export json] [save view] │
│  Severity                            │                                       │
│   ▢ info  ▢ notice                   │  ┌─────────────────────────────────┐  │
│   ▣ warning  ▣ error  ▣ critical    │  │ time · actor · cat · subject ·  │  │
│                                      │  │  field · old → new · run        │  │
│  Event category                      │  └─────────────────────────────────┘  │
│   ▣ data_change                      │  Dense table, 60 rows/page.           │
│   ▣ lifecycle  ▣ tag_change          │  Each row click expands inline:       │
│   ▣ import  ▣ schema  ▣ workflow     │   • full old/new diff (jsonb pretty)  │
│   ▣ prompt  ▣ review  ▣ exception    │   • actor card + ip + user_agent      │
│                                      │   • related run link (workflow/run)   │
│  Subject kind                        │   • request_id correlation            │
│   [components ✕] [journeys ✕] …      │   • tags as removable chips           │
│                                      │                                       │
│  Subject (search)                    │  Every cell is click-to-filter:       │
│  [▢ search by id or name]            │   click an actor → adds actor filter  │
│                                      │   click a category → adds cat filter  │
│  Actor                               │   click a subject → adds subject id   │
│  [▢ user picker]                     │   click a run → jumps to run scope    │
│                                      │                                       │
│  Source                              │                                       │
│   ▣ human  ▣ agent  ▣ workflow ▣ system │                                  │
│                                      │                                       │
│  Run                                 │                                       │
│  [workflow_run / ingestion_run] +id │                                       │
│                                      │                                       │
│  Field changed                       │                                       │
│  [▢ field name]                      │                                       │
│                                      │                                       │
│  [Reset all]                         │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

Three saved-view presets ship by default, mapping to the user's three lenses:

- **Operational review** — last 7d, all categories, severity ≥ info, grouped by subject kind.
- **Security & change visibility** — last 30d, categories: `auth`, `lifecycle` (delete only), `schema`, severity ≥ warning, source = human.
- **Compliance traceability** — last 90d, categories: `schema`, `import`, `review`, `prompt`, `exception`, plus any row tagged `pii`, immutable export.

Saved views are stored in a small `audit_saved_views` table per user; admins can pin views to the workspace.

## Detail panel (expanded row)

Inline expand, not a sheet — keeps the operator scanning. Shows:

1. **Header**: timestamp (with relative + absolute), actor avatar + name + ip, source pill, severity badge.
2. **Subject**: kind + name (deep link to the entity page) + id (monospace, click-to-copy).
3. **Change**: `field` · `old_value` → `new_value` rendered as a side-by-side diff (jsonb pretty-printed when nested).
4. **Context**: linked workflow run, ingestion run, or prompt with deep links; `request_id` chip that filters to the full correlated trail.
5. **Actions**: "View entity", "View run", "Filter to this subject", "Copy as evidence" (markdown snippet for compliance reports).

## Export and retention

- **Export**: CSV and JSONL streams of the current filtered query, generated server-side (`/api/audit/export.csv` and `.jsonl`) with admin-only access. Exports themselves write a `prompt`/`review` audit event noting "audit_export by X covering Y rows" so exports are themselves auditable.
- **Retention**: a `retention_policy` setting per category (default: never delete). A nightly server fn enforces it — but only soft-archives by moving rows to `entity_audit_log_archive` (same schema). Hard delete requires admin + a typed confirmation.

## Files

**Migration (one):**
- `entity_audit_log`: add columns above + indexes + immutability trigger
- New tables: `audit_field_blacklist`, `audit_write_failures`, `audit_saved_views`, `entity_audit_log_archive`
- New view: `audit_events_enriched`
- New trigger function `trg_generic_audit()` + per-table triggers on the curated allow-list
- Seed default field blacklist (timestamps, computed cols)

**New server:**
- `src/utils/audit.server.ts` — `logAuditEvent` writer used by edge functions
- `src/utils/audit.functions.ts` — `listAuditEvents`, `exportAuditEvents`, `saveView`, `listViews`, `mirrorAuthEvents`
- `src/routes/api/audit/export.csv.ts` and `.jsonl.ts` — admin-only streaming exports

**New route + components:**
- `src/routes/_app.audit.tsx` — full-bleed console
- `src/components/audit/audit-filter-rail.tsx`
- `src/components/audit/audit-results-table.tsx` (dense table with expand)
- `src/components/audit/audit-row-detail.tsx` (diff + context)
- `src/components/audit/audit-saved-views.tsx`
- `src/components/audit/audit-summary-strip.tsx` (counts + warnings)
- `src/components/audit/audit-export-dialog.tsx`
- `src/components/audit/severity-pill.tsx`, `event-category-chip.tsx`

**Edited:**
- `src/components/sidebar-nav.tsx` — add **Audit Trail** under Settings group
- `src/components/evidence-footer.tsx` — add "View in audit" deep link
- `src/components/audit-trail-panel.tsx` — add the same deep link
- `src/components/entity-frameworks-rail.tsx` — switch its direct insert over to `logAuditEvent` (sets category=`prompt`, source=`agent`)
- `supabase/functions/generate-lens-perspectives/index.ts` (and the other `generate-*` functions) — switch to `logAuditEvent` for consistent metadata
- `src/utils/ingestion.functions.ts` — emit audit events at every approval / conflict resolution / recipe save

**Memory:**
- New `mem://design/audit-trail.md`: Audit Trail and Story Trail are different surfaces with different jobs. Audit is append-only, formal, filterable, exportable. Story is narrative, summarized, no diffs. Every meaningful write goes through `logAuditEvent`. Generic CRUD trigger keeps coverage automatic.

## Sequencing

1. Migration: extend table, add indexes, immutability trigger, archive table, saved views, blacklist, enriched view (~15%)
2. `logAuditEvent` helper + retrofit existing call sites (frameworks rail, generate-* functions) (~10%)
3. Generic CRUD trigger + field blacklist seed for the curated table list (~15%)
4. `/audit` route shell + filter rail + dense results table + summary strip (~25%)
5. Row detail expand with diff + click-to-filter on every cell (~10%)
6. Saved views + 3 default presets + per-user persistence (~10%)
7. CSV/JSONL streaming exports + audit-of-audit write (~5%)
8. Ingestion + workflow event emitters + auth event mirror cron (~10%)

## Not in this wave

- No real-time tail (websocket stream) — polling refresh button + 30s auto-poll is enough for review work; live tailing is a follow-up.
- No anomaly detection / "this is unusual" alerts — useful but a separate wave.
- No SIEM forwarder (Splunk, Datadog) — exports cover the immediate need.
- No cryptographic chaining (hash-chain rows for tamper-evidence) — append-only + admin-only delete is the v1 guarantee; chaining is a follow-up if compliance asks.
- No rewriting Story Trail — it stays exactly as it is.

## After this wave

A compliance reviewer opens `/audit`, picks the **Compliance traceability** preset, narrows to the last 30 days and category `schema`, sees every approved schema change with actor, ip, and the exact field/value diff, expands two rows, exports the filtered set as JSONL, and the export itself appears as the next audit event. An operator triaging an incident clicks an actor name in any row, the filter rail snaps to that actor, and they can see every action that user took across every subject in the workspace — without leaving the page.

