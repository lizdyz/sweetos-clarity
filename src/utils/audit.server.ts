// Server-only audit writer. Best-effort: failures never block the originating
// action — they are written to `audit_write_failures` instead.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AuditEventInput } from "@/lib/audit";

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const row = {
      subject_kind: input.subjectKind,
      subject_id: input.subjectId,
      field: input.field ?? null,
      old_value: input.oldValue !== undefined ? input.oldValue : null,
      new_value: input.newValue !== undefined ? input.newValue : null,
      diff: input.diff !== undefined ? input.diff : null,
      change_type: input.changeType ?? "update",
      event_category: input.eventCategory ?? "data_change",
      severity: input.severity ?? "info",
      source: input.source ?? "human",
      source_run_kind: input.sourceRunKind ?? null,
      source_run_id: input.sourceRunId ?? null,
      operator_id: input.operatorId ?? null,
      agent_run_id: input.agentRunId ?? null,
      model: input.model ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      request_id: input.requestId ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    };
    const { error } = await supabaseAdmin.from("entity_audit_log").insert(row as never);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[audit] write failed:", error.message, row);
      await supabaseAdmin.from("audit_write_failures").insert({
        subject_kind: input.subjectKind,
        subject_id: input.subjectId,
        event_category: input.eventCategory ?? "data_change",
        error_message: error.message,
        payload: row as never,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] write threw:", err);
  }
}
