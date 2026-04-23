// Client-safe audit types and constants. Used by both the audit console UI
// and the server-side `logAuditEvent` writer.

export const AUDIT_CATEGORIES = [
  "data_change",
  "lifecycle",
  "tag_change",
  "relationship_change",
  "import",
  "schema",
  "recipe",
  "workflow",
  "prompt",
  "review",
  "exception",
  "auth",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_SEVERITIES = ["info", "notice", "warning", "error", "critical"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_SOURCES = ["human", "agent", "workflow", "system"] as const;
export type AuditSource = (typeof AUDIT_SOURCES)[number];

export const AUDIT_RUN_KINDS = [
  "workflow_run",
  "ingestion_run",
  "lens_run",
  "curator_run",
] as const;
export type AuditRunKind = (typeof AUDIT_RUN_KINDS)[number];

export interface AuditEventInput {
  subjectKind: string;
  subjectId: string;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  diff?: unknown;
  changeType?: "create" | "update" | "delete" | "archive" | "restore" | string;
  eventCategory?: AuditCategory;
  severity?: AuditSeverity;
  source?: AuditSource;
  operatorId?: string | null;
  agentRunId?: string | null;
  model?: string | null;
  sourceRunKind?: AuditRunKind | null;
  sourceRunId?: string | null;
  notes?: string | null;
  tags?: string[];
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditEventRow {
  id: string;
  subject_kind: string;
  subject_id: string;
  subject_label: string | null;
  field: string | null;
  old_value: unknown;
  new_value: unknown;
  diff: unknown;
  change_type: string;
  event_category: AuditCategory;
  severity: AuditSeverity;
  source: AuditSource;
  source_run_kind: string | null;
  source_run_id: string | null;
  operator_id: string | null;
  operator_name: string | null;
  agent_run_id: string | null;
  model: string | null;
  notes: string | null;
  tags: string[];
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  created_by: string | null;
  actor_display_name: string | null;
}

export interface AuditFilters {
  date_range?: "24h" | "7d" | "30d" | "90d" | "all";
  date_from?: string | null;
  date_to?: string | null;
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  sources?: AuditSource[];
  subject_kinds?: string[];
  subject_id?: string | null;
  actor_id?: string | null;
  source_run_kind?: string | null;
  source_run_id?: string | null;
  field?: string | null;
  search?: string | null;
  tags_any?: string[];
  request_id?: string | null;
  group_by?: string | null;
  limit?: number;
  offset?: number;
}

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  data_change: "Data change",
  lifecycle: "Lifecycle",
  tag_change: "Tag change",
  relationship_change: "Relationship",
  import: "Import",
  schema: "Schema",
  recipe: "Recipe",
  workflow: "Workflow",
  prompt: "Prompt",
  review: "Review",
  exception: "Exception",
  auth: "Auth",
};

export const SEVERITY_RANK: Record<AuditSeverity, number> = {
  info: 0,
  notice: 1,
  warning: 2,
  error: 3,
  critical: 4,
};
