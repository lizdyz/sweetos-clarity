import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ActivateInput = z.object({
  workflowId: z.string().uuid(),
  relationshipId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

/**
 * Compute HMAC-SHA256 hex signature using Web Crypto (Worker-compatible).
 */
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface FieldMap {
  [externalKey: string]: string; // value is a dotted path like "relationship.name"
}

interface PayloadContext {
  relationship?: { id: string; name: string | null; email?: string | null } | null;
  project?: { id: string; name: string | null } | null;
  trigger?: { notes: string | null };
  run?: { id: string };
  workflow?: { id: string; name: string };
}

function resolvePath(ctx: PayloadContext, path: string): unknown {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = ctx;
  for (const p of parts) {
    if (cur == null) return null;
    cur = cur[p];
  }
  return cur ?? null;
}

function buildExternalPayload(fieldMap: FieldMap, ctx: PayloadContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [externalKey, internalPath] of Object.entries(fieldMap ?? {})) {
    out[externalKey] = resolvePath(ctx, internalPath);
  }
  // Always include the run id so the external system can include it in callbacks.
  if (ctx.run?.id) out.lovable_run_id = ctx.run.id;
  if (ctx.workflow?.id) out.lovable_workflow_id = ctx.workflow.id;
  return out;
}

/**
 * Activate a workflow on a relationship (and optionally a project).
 *
 * For native workflows: creates a `workflow_runs` row + stages a kickoff Quest proposal.
 * For external workflows (n8n/make/zapier): also POSTs an HMAC-signed payload to the
 * binding's trigger_url. Callbacks land at /api/public/hooks/workflow-callback.
 */
export const activateWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActivateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context;

    // Look up workflow for naming + execution kind
    const { data: workflow, error: wfErr } = await sb
      .from("workflows")
      .select("id, name, description, execution_kind")
      .eq("id", data.workflowId)
      .maybeSingle();
    if (wfErr || !workflow) {
      return { ok: false as const, error: "Workflow not found" };
    }

    const executionKind: string = (workflow as { execution_kind?: string }).execution_kind ?? "native";

    // Optional relationship
    let relationship: { id: string; name: string | null; email: string | null } | null = null;
    if (data.relationshipId) {
      const { data: rel } = await sb
        .from("relationships")
        .select("id, name, email")
        .eq("id", data.relationshipId)
        .maybeSingle();
      if (rel) {
        relationship = {
          id: rel.id,
          name: rel.name ?? null,
          email: (rel as { email?: string | null }).email ?? null,
        };
      }
    }

    // Optional project
    let project: { id: string; name: string | null } | null = null;
    if (data.projectId) {
      const { data: pr } = await sb
        .from("projects")
        .select("id, name")
        .eq("id", data.projectId)
        .maybeSingle();
      if (pr) project = { id: pr.id, name: pr.name ?? null };
    }

    // Create the workflow run
    const { data: run, error: runErr } = await sb
      .from("workflow_runs")
      .insert({
        workflow_id: data.workflowId,
        relationship_id: data.relationshipId ?? null,
        project_id: data.projectId ?? null,
        status: executionKind === "native" ? "planned" : "running",
        progress_pct: 0,
        notes: data.notes ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (runErr || !run) {
      return { ok: false as const, error: runErr?.message ?? "Failed to create run" };
    }

    // Stage a starter quest as a proposal (native + external both get this for visibility).
    const questName = relationship?.name
      ? `${workflow.name} — kickoff for ${relationship.name}`
      : `${workflow.name} — kickoff`;
    await sb.from("proposals").insert({
      entity_type: "quest",
      status: "pending",
      source: "manual",
      source_label: "workflow_activation",
      source_ref: `workflow_run:${run.id}`,
      raw_input: `Activate workflow "${workflow.name}"${
        relationship?.name ? ` on ${relationship.name}` : ""
      }`,
      proposed_fields: {
        name: questName,
        description:
          workflow.description ?? `Auto-generated quest from activating ${workflow.name}.`,
        progression_state: "Open",
      },
      confidence: 0.9,
      conflicts: [],
      ai_model: null,
      ai_notes: "Generated by workflow activation. Review and approve to materialize.",
      created_by: userId,
    });

    // External execution path
    if (executionKind !== "native") {
      const { data: binding } = await sb
        .from("workflow_execution_bindings")
        .select("trigger_url, callback_secret, field_map")
        .eq("workflow_id", data.workflowId)
        .maybeSingle();

      if (!binding?.trigger_url) {
        // Mark run as paused; still return early so caller knows config is missing.
        await sb
          .from("workflow_runs")
          .update({
            status: "paused",
            notes: `${data.notes ?? ""}\n[execution] No trigger URL configured for ${executionKind}.`.trim(),
          })
          .eq("id", run.id);
        return {
          ok: false as const,
          error: `Workflow is set to ${executionKind} but has no trigger URL configured.`,
          runId: run.id,
        };
      }

      const ctx: PayloadContext = {
        relationship,
        project,
        trigger: { notes: data.notes ?? null },
        run: { id: run.id },
        workflow: { id: workflow.id, name: workflow.name },
      };
      const payload = buildExternalPayload(
        (binding.field_map as FieldMap) ?? {},
        ctx,
      );
      const body = JSON.stringify(payload);

      try {
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (binding.callback_secret) {
          headers["x-lovable-signature"] = await hmacSha256Hex(
            binding.callback_secret,
            body,
          );
        }
        const res = await fetch(binding.trigger_url, {
          method: "POST",
          headers,
          body,
        });
        const text = await res.text();
        let externalRunId: string | null = null;
        try {
          const parsed = JSON.parse(text) as { id?: string; run_id?: string; executionId?: string };
          externalRunId = parsed.id ?? parsed.run_id ?? parsed.executionId ?? null;
        } catch {
          // not JSON, that's fine
        }
        if (!res.ok) {
          await sb
            .from("workflow_runs")
            .update({
              status: "cancelled",
              notes: `${data.notes ?? ""}\n[execution] Trigger failed (${res.status}): ${text.slice(0, 500)}`.trim(),
            })
            .eq("id", run.id);
          return {
            ok: false as const,
            error: `External trigger failed: ${res.status}`,
            runId: run.id,
          };
        }
        await sb
          .from("workflow_runs")
          .update({ external_run_id: externalRunId ?? run.id })
          .eq("id", run.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await sb
          .from("workflow_runs")
          .update({
            status: "cancelled",
            notes: `${data.notes ?? ""}\n[execution] Trigger error: ${msg}`.trim(),
          })
          .eq("id", run.id);
        return { ok: false as const, error: msg, runId: run.id };
      }
    }

    return { ok: true as const, runId: run.id };
  });
