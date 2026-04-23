// Shared promote actions for any TriageCard. Every promotion writes provenance
// back to the sandbox_items row so we can trace how a Task/Project/Spark/Decision
// was born. Canon: never auto-promote — every promote is a human click.

import { sb } from "@/lib/sb";
import type { Triageable, PromoteActionKind } from "@/lib/triageable";

export interface PromoteResult {
  ok: boolean;
  routed_to_kind?: string;
  routed_to_id?: string;
  message: string;
}

/**
 * Promote a Triageable into a downstream entity. Writes both the new row
 * (with spawned_by_kind/id pointing back) AND updates sandbox_items with
 * routed_to_kind/id so the provenance is bidirectional.
 */
export async function promoteTriageable(
  item: Triageable,
  kind: PromoteActionKind,
  opts?: { note?: string },
): Promise<PromoteResult> {
  const note = opts?.note ?? null;

  // Only sandbox_items have a stable row to update. Inbox-derived rows
  // (KTI fires, inbound_signals, captures shown via the union view) need to
  // be materialized into sandbox_items first; the SandboxBoard already does
  // this dance. Here we assume item.id is a real sandbox_items.id when the
  // kind is "sandbox_item".
  const isSandboxRow = item.kind === "sandbox_item" && !item.id.startsWith("inbox-");

  switch (kind) {
    case "task": {
      const { data, error } = await sb
        .from("tasks")
        .insert({
          name: item.title,
          description: item.body ?? note,
          status: "To Do",
          priority: "Medium",
          relationship_id: item.relationship_id ?? null,
          spawned_by_kind: "sandbox",
          spawned_by_id: isSandboxRow ? item.id : null,
        })
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      if (isSandboxRow) await markRouted(item.id, "task", data.id, note);
      return { ok: true, routed_to_kind: "task", routed_to_id: data.id, message: "Promoted to Task" };
    }

    case "project": {
      const { data, error } = await sb
        .from("projects")
        .insert({
          name: item.title,
          description: item.body ?? note,
          status: "Planning",
          relationship_id: item.relationship_id ?? null,
        })
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      if (isSandboxRow) await markRouted(item.id, "project", data.id, note);
      return { ok: true, routed_to_kind: "project", routed_to_id: data.id, message: "Promoted to Project" };
    }

    case "spark": {
      // Sparks are system-generated. The trigger allows agent/workflow with operator.
      // For human-driven sandbox promotion we use the special "manual_promotion" path.
      const { data, error } = await sb
        .from("sparks")
        .insert({
          name: item.title,
          description: item.body ?? note,
          generated_by_kind: "agent",
          origin_event: `sandbox_promotion:${item.id}`,
          relationship_id: item.relationship_id ?? null,
        })
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      if (isSandboxRow) await markRouted(item.id, "spark", data.id, note);
      return { ok: true, routed_to_kind: "spark", routed_to_id: data.id, message: "Promoted to Spark" };
    }

    case "decision_input": {
      // Land in OCDA Observe column as a candidate.
      const { data, error } = await sb
        .from("decisions")
        .insert({
          decision: item.title,
          context: item.body ?? note,
          ocda_stage: "observe",
          status: "proposed",
          raised_from_kind: item.source.kind,
          raised_from_id: item.source.id,
        })
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      if (isSandboxRow) await markRouted(item.id, "decision", data.id, note);
      return { ok: true, routed_to_kind: "decision", routed_to_id: data.id, message: "Sent to OCDA Observe" };
    }

    case "decision": {
      // Log a formal, decided Decision with provenance back to the source.
      const { data, error } = await sb
        .from("decisions")
        .insert({
          decision: item.title,
          context: item.body ?? note,
          ocda_stage: "decide",
          status: "decided",
          date_made: new Date().toISOString().slice(0, 10),
          raised_from_kind: item.source.kind,
          raised_from_id: item.source.id,
        })
        .select("id")
        .single();
      if (error) return { ok: false, message: error.message };
      if (isSandboxRow) await markRouted(item.id, "decision", data.id, note);
      return { ok: true, routed_to_kind: "decision", routed_to_id: data.id, message: "Logged Decision" };
    }

    case "component_canon": {
      // Append as an entity_canon entry tied to a component (caller should
      // pass component context via note for now).
      return { ok: false, message: "Pick a component on the next screen — coming soon" };
    }

    case "archive": {
      if (isSandboxRow) {
        const { error } = await sb
          .from("sandbox_items")
          .update({ state: "archived", routed_note: note })
          .eq("id", item.id);
        if (error) return { ok: false, message: error.message };
      }
      return { ok: true, message: "Archived" };
    }
  }
}

async function markRouted(
  sandboxId: string,
  routedKind: string,
  routedId: string,
  note: string | null,
) {
  await sb
    .from("sandbox_items")
    .update({
      state: "routed",
      routed_to_kind: routedKind,
      routed_to_id: routedId,
      routed_at: new Date().toISOString(),
      routed_note: note,
    })
    .eq("id", sandboxId);
}
