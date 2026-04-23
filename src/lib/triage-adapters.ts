// Adapters that turn raw DB rows from various surfaces into the canonical
// Triageable shape so the same <TriageCard /> can render any of them.

import type { InboundSignal } from "@/components/inbound-signal-card";
import { type Triageable, DEFAULT_PROMOTE_OPTIONS } from "@/lib/triageable";

export function inboundSignalToTriageable(s: InboundSignal): Triageable {
  return {
    id: s.id,
    kind: "inbound_signal",
    title: s.summary?.slice(0, 120) || s.source_url || "(inbound signal)",
    body: s.summary,
    source: { kind: "inbound_signal", id: s.id, label: s.source_kind },
    state: s.status === "pending" ? "raw" : s.status === "routed" ? "routed" : "archived",
    frames: [],
    promote_options: DEFAULT_PROMOTE_OPTIONS,
    provenance: { upstream: [], downstream: [] },
    created_at: s.created_at,
    confidence: s.confidence,
    relationship_id:
      s.classified_subject_type === "relationship" ? s.classified_subject_id : null,
  };
}

interface SparkRow {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  origin_event?: string | null;
  scope?: string | null;
  relationship_id?: string | null;
  done_at?: string | null;
}

export function sparkToTriageable(s: SparkRow): Triageable {
  return {
    id: s.id,
    kind: "spark",
    title: s.name,
    body: s.description ?? null,
    source: { kind: "spark", id: s.id, label: s.origin_event ?? "system" },
    state: s.done_at ? "routed" : "active",
    frames: [],
    promote_options: DEFAULT_PROMOTE_OPTIONS,
    provenance: { upstream: [], downstream: [] },
    created_at: s.created_at ?? undefined,
    relationship_id: s.relationship_id ?? null,
  };
}

interface DecisionRow {
  id: string;
  decision: string;
  context?: string | null;
  status?: string | null;
  created_at?: string | null;
  ocda_stage?: string | null;
}

export function decisionToTriageable(d: DecisionRow): Triageable {
  const state =
    d.status === "decided"
      ? "routed"
      : d.status === "superseded" || d.status === "rolled_back"
        ? "archived"
        : "raw";
  return {
    id: d.id,
    kind: "decision_input",
    title: d.decision,
    body: d.context ?? null,
    source: { kind: "decision", id: d.id, label: d.ocda_stage ?? "decision" },
    state,
    frames: [],
    promote_options: DEFAULT_PROMOTE_OPTIONS,
    provenance: { upstream: [], downstream: [] },
    created_at: d.created_at ?? undefined,
    relationship_id: null,
  };
}

interface CaptureRow {
  id: string;
  raw_text: string;
  status: string | null;
  created_at: string;
  source: string | null;
}

export function captureToTriageable(c: CaptureRow): Triageable {
  return {
    id: c.id,
    kind: "sandbox_item",
    title: c.raw_text.split("\n")[0].slice(0, 120) || "(capture)",
    body: c.raw_text,
    source: { kind: "capture", id: c.id, label: c.source ?? "capture" },
    state: c.status === "Pending" ? "raw" : c.status === "Approved" ? "routed" : "archived",
    frames: [],
    promote_options: DEFAULT_PROMOTE_OPTIONS,
    provenance: { upstream: [], downstream: [] },
    created_at: c.created_at,
    relationship_id: null,
  };
}
