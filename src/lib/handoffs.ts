import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HandoffSubjectKind = "task" | "workflow_step_run" | "session" | "project" | "campaign";
export type HandoffReason = "ready_for_review" | "blocked" | "escalation" | "fyi" | "reassign";
export type HandoffStatus = "pending" | "accepted" | "declined" | "cancelled" | "auto_completed";

const SubjectKind = z.enum(["task", "workflow_step_run", "session", "project", "campaign"]);
const Reason = z.enum(["ready_for_review", "blocked", "escalation", "fyi", "reassign"]);

const CreateInput = z.object({
  fromOperatorId: z.string().uuid().nullable(),
  toOperatorId: z.string().uuid(),
  subjectKind: SubjectKind,
  subjectId: z.string().uuid(),
  reason: Reason.default("ready_for_review"),
  note: z.string().max(2000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const RespondInput = z.object({
  handoffId: z.string().uuid(),
  action: z.enum(["accept", "decline", "cancel"]),
});

async function reassignSubject(
  supabase: Awaited<ReturnType<typeof requireSupabaseAuth.server.fn>>["context"]["supabase"],
  kind: HandoffSubjectKind,
  id: string,
  toOperatorId: string | null,
  receiverName?: string | null,
  reason?: HandoffReason,
) {
  if (kind === "task") {
    const patch: Record<string, unknown> = { assignee_id: toOperatorId };
    if (reason === "blocked" && receiverName) patch.waiting_on = receiverName;
    await supabase.from("tasks").update(patch).eq("id", id);
  } else if (kind === "workflow_step_run") {
    await supabase.from("workflow_step_runs").update({ assignee_id: toOperatorId }).eq("id", id);
  } else if (kind === "project") {
    await supabase.from("projects").update({ assignee_id: toOperatorId }).eq("id", id);
  } else if (kind === "campaign") {
    await supabase.from("campaigns").update({ operator_id: toOperatorId }).eq("id", id);
  } else if (kind === "session") {
    await supabase.from("sessions").update({ assignee_id: toOperatorId }).eq("id", id);
  }
}

export const createHandoff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: receiver } = await supabase
      .from("operators")
      .select("display_name, name")
      .eq("id", data.toOperatorId)
      .maybeSingle();
    const receiverName =
      (receiver as { display_name?: string; name?: string } | null)?.display_name ??
      (receiver as { name?: string } | null)?.name ??
      null;

    const { data: inserted, error } = await supabase
      .from("handoff_events")
      .insert({
        from_operator_id: data.fromOperatorId,
        to_operator_id: data.toOperatorId,
        subject_kind: data.subjectKind,
        subject_id: data.subjectId,
        reason: data.reason,
        note: data.note ?? null,
        due_date: data.dueDate ?? null,
        created_by: userId,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await reassignSubject(
      supabase,
      data.subjectKind,
      data.subjectId,
      data.toOperatorId,
      receiverName,
      data.reason,
    );

    return { handoff: inserted };
  });

export const respondToHandoff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RespondInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: existing, error: fetchErr } = await supabase
      .from("handoff_events")
      .select("*")
      .eq("id", data.handoffId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) return { ok: false, reason: "not_found" as const };
    if (existing.status !== "pending") return { ok: false, reason: "already_handled" as const };

    const newStatus: HandoffStatus =
      data.action === "accept" ? "accepted" : data.action === "decline" ? "declined" : "cancelled";

    const { data: updated, error: updErr } = await supabase
      .from("handoff_events")
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq("id", data.handoffId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (updErr) throw new Error(updErr.message);
    if (!updated) return { ok: false, reason: "race" as const };

    if (data.action === "decline" || data.action === "cancel") {
      await reassignSubject(
        supabase,
        existing.subject_kind as HandoffSubjectKind,
        existing.subject_id,
        existing.from_operator_id,
      );
      if (data.action === "decline") {
        await supabase.from("bot_alerts").insert({
          kind: "handoff_declined",
          title: "Handoff declined",
          body: `Your handoff was declined${existing.note ? `: ${existing.note}` : "."}`,
          for_user_id: existing.created_by,
          source_kind: "handoff_event",
          source_id: existing.id,
        });
      }
    }

    return { ok: true as const, handoff: updated };
  });
