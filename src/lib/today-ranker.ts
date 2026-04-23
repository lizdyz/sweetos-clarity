// Today ranker — pure deterministic function that orders the next-best-actions.
// No AI, no async. Inputs are already-fetched view rows; output is a flat ranked list.
//
// Priority weights (higher wins):
//   handoff (pending, inbound)        100  + age boost
//   workflow approval (awaiting)       80  + age boost
//   overdue task                       60  + days-overdue * 5
//   kti fire (last 24h, my rels)       50  + recency boost
//   scheduled today                    30
//
// Sparks are intentionally excluded — they are system-generated and belong in /sparks
// (see mem://design/canon-sparks-vs-tasks.md).

export type RankedSourceKind = "handoff" | "approval" | "overdue" | "kti_fire" | "scheduled";

export interface RankedAction {
  /** Stable client-side key */
  key: string;
  /** What kind of work this points at (drives the icon, route, walk-menu kind) */
  subject_kind: "task" | "project" | "campaign" | "session" | "workflow_step_run" | "kti";
  subject_id: string;
  /** Human-readable title */
  title: string;
  /** "Why this is on the list" — one sentence */
  why: string;
  /** Source feed (drives badge color/icon) */
  source: RankedSourceKind;
  /** ISO timestamp used for "X ago" + tiebreaker */
  occurred_at: string;
  /** Optional handoff id when source = 'handoff' (used for Accept/Decline) */
  handoff_id?: string;
  /** Optional relationship (used for context badges) */
  relationship_id?: string | null;
  /** Computed score — higher floats up */
  score: number;
}

export interface HandoffInput {
  id: string;
  subject_kind: "task" | "workflow_step_run" | "session" | "project" | "campaign";
  subject_id: string;
  subject_label: string | null;
  reason: string;
  from_name: string | null;
  created_at: string;
}

export interface ApprovalInput {
  step_run_id: string;
  step_name: string;
  workflow_id: string;
  run_id: string;
  started_at: string | null;
}

export interface OverdueInput {
  entity_type: "task" | "project" | "session" | "campaign";
  entity_id: string;
  name: string;
  due_date: string | null;
  scheduled_for: string | null;
  status: string | null;
  relationship_id: string | null;
}

export interface KtiFireInput {
  scan_id: string;
  kti_id: string;
  kti_name: string;
  observed_value: string | null;
  scanned_at: string;
  relationship_id: string | null;
}

export interface ScheduledInput {
  entity_type: "task" | "project" | "session" | "campaign";
  entity_id: string;
  name: string;
  scheduled_for: string;
  relationship_id: string | null;
}

const REASON_LABEL: Record<string, string> = {
  ready_for_review: "ready for review",
  blocked: "blocked — needs you",
  escalation: "escalation",
  fyi: "fyi",
  reassign: "reassign",
};

function ageHours(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function daysOverdue(due: string): number {
  const d = new Date(due).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - d) / 86_400_000));
}

export function rankNextActions(input: {
  handoffs: HandoffInput[];
  approvals: ApprovalInput[];
  overdue: OverdueInput[];
  ktiFires: KtiFireInput[];
  scheduled: ScheduledInput[];
}): RankedAction[] {
  const out: RankedAction[] = [];

  for (const h of input.handoffs) {
    const age = ageHours(h.created_at);
    out.push({
      key: `handoff-${h.id}`,
      subject_kind: h.subject_kind,
      subject_id: h.subject_id,
      title: h.subject_label ?? `Handoff ${h.id.slice(0, 8)}`,
      why: `${h.from_name ?? "Someone"} handed this to you · ${REASON_LABEL[h.reason] ?? h.reason}`,
      source: "handoff",
      occurred_at: h.created_at,
      handoff_id: h.id,
      score: 100 + Math.min(age * 0.5, 20),
    });
  }

  for (const a of input.approvals) {
    const age = a.started_at ? ageHours(a.started_at) : 0;
    out.push({
      key: `approval-${a.step_run_id}`,
      subject_kind: "workflow_step_run",
      subject_id: a.step_run_id,
      title: a.step_name,
      why: "Workflow step is awaiting your approval",
      source: "approval",
      occurred_at: a.started_at ?? new Date().toISOString(),
      score: 80 + Math.min(age * 0.5, 15),
    });
  }

  for (const o of input.overdue) {
    const due = o.due_date ?? o.scheduled_for;
    if (!due) continue;
    const days = daysOverdue(due);
    out.push({
      key: `overdue-${o.entity_type}-${o.entity_id}`,
      subject_kind: o.entity_type,
      subject_id: o.entity_id,
      title: o.name,
      why: days === 0 ? "Due today and not started" : `Overdue by ${days} day${days === 1 ? "" : "s"}`,
      source: "overdue",
      occurred_at: due,
      relationship_id: o.relationship_id,
      score: 60 + Math.min(days * 5, 30),
    });
  }

  for (const k of input.ktiFires) {
    const age = ageHours(k.scanned_at);
    out.push({
      key: `kti-${k.scan_id}`,
      subject_kind: "kti",
      subject_id: k.kti_id,
      title: `KTI fired: ${k.kti_name}`,
      why: k.observed_value ? `Observed: ${k.observed_value}` : "Threshold crossed in the last 24h",
      source: "kti_fire",
      occurred_at: k.scanned_at,
      relationship_id: k.relationship_id,
      score: 50 - Math.min(age, 20),
    });
  }

  for (const s of input.scheduled) {
    out.push({
      key: `scheduled-${s.entity_type}-${s.entity_id}`,
      subject_kind: s.entity_type,
      subject_id: s.entity_id,
      title: s.name,
      why: "Scheduled for today",
      source: "scheduled",
      occurred_at: s.scheduled_for,
      relationship_id: s.relationship_id,
      score: 30,
    });
  }

  // Dedupe by subject — a task that appears as both handoff + overdue keeps the higher score
  const seen = new Map<string, RankedAction>();
  for (const a of out) {
    const k = `${a.subject_kind}:${a.subject_id}`;
    const prev = seen.get(k);
    if (!prev || a.score > prev.score) seen.set(k, a);
  }

  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}

export function hrefForSubject(
  kind: RankedAction["subject_kind"],
  id: string,
  workflowId?: string,
  runId?: string,
): { to: string; params: Record<string, string> } {
  switch (kind) {
    case "task": return { to: "/tasks/$id", params: { id } };
    case "project": return { to: "/projects/$id", params: { id } };
    case "campaign": return { to: "/campaigns/$id", params: { id } };
    case "session": return { to: "/sessions/$id", params: { id } };
    case "kti": return { to: "/library/ktis/$id", params: { id } };
    case "workflow_step_run":
      if (workflowId && runId) {
        return { to: "/workflows/$id/runs/$runId", params: { id: workflowId, runId } };
      }
      return { to: "/workflows", params: {} };
    default: return { to: "/today", params: {} };
  }
}
