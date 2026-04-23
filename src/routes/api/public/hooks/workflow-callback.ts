import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Inbound callback receiver for external workflow execution adapters
 * (n8n, Make, Zapier). Verifies HMAC signature against the binding's
 * callback_secret, then updates the workflow_run / workflow_step_run.
 *
 * Body shape:
 * {
 *   "external_run_id": "...",
 *   "step": "Send intro email" | { "name": "..." } | { "external_step_id": "..." },
 *   "status": "succeeded" | "failed" | "running" | "approved" | ...,
 *   "output": { ... }
 * }
 */
export const Route = createFileRoute("/api/public/hooks/workflow-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) return json({ error: "missing service key" }, 500);

        const sb = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const rawBody = await request.text();
        let body: CallbackBody;
        try {
          body = JSON.parse(rawBody) as CallbackBody;
        } catch {
          return json({ error: "invalid json" }, 400);
        }

        const externalRunId = body.external_run_id ?? body.lovable_run_id;
        if (!externalRunId) {
          return json({ error: "missing external_run_id" }, 400);
        }

        // Find the run. We accept either our internal run id (preferred — we send
        // it as `lovable_run_id` in the outbound payload) or the external_run_id
        // we stored after the trigger.
        const { data: runByExt } = await sb
          .from("workflow_runs")
          .select("id, workflow_id, status")
          .eq("external_run_id", externalRunId)
          .maybeSingle();
        let run = runByExt as { id: string; workflow_id: string; status: string | null } | null;
        if (!run) {
          const { data: runById } = await sb
            .from("workflow_runs")
            .select("id, workflow_id, status")
            .eq("id", externalRunId)
            .maybeSingle();
          run = runById as { id: string; workflow_id: string; status: string | null } | null;
        }
        if (!run) return json({ error: "run not found" }, 404);

        // Verify HMAC signature against the binding's callback_secret
        const { data: binding } = await sb
          .from("workflow_execution_bindings")
          .select("callback_secret, status_map")
          .eq("workflow_id", run.workflow_id)
          .maybeSingle();

        if (binding?.callback_secret) {
          const sig = request.headers.get("x-lovable-signature") ?? "";
          const expected = await hmacSha256Hex(binding.callback_secret, rawBody);
          if (!timingSafeEqualHex(sig, expected)) {
            return json({ error: "invalid signature" }, 401);
          }
        }

        // Map external status → our status
        const statusMap = (binding?.status_map as Record<string, string> | null) ?? {};
        const mappedStatus = mapStatus(body.status, statusMap);

        // Resolve step (if provided)
        type StepRec = { id: string; step_id: string };
        let stepRecord: StepRec | null = null;
        if (body.step) {
          const stepName = typeof body.step === "string" ? body.step : body.step?.name ?? null;
          const externalStepId =
            typeof body.step === "object" ? body.step?.external_step_id ?? null : null;

          if (externalStepId) {
            const { data: bySr } = await sb
              .from("workflow_step_runs")
              .select("id, step_id")
              .eq("run_id", run.id)
              .eq("external_step_id", externalStepId)
              .maybeSingle();
            if (bySr) stepRecord = bySr as StepRec;
          }
          if (!stepRecord && stepName) {
            const { data: step } = await sb
              .from("workflow_steps")
              .select("id")
              .eq("workflow_id", run.workflow_id)
              .eq("name", stepName)
              .maybeSingle();
            if (step) {
              const { data: existingSr } = await sb
                .from("workflow_step_runs")
                .select("id, step_id")
                .eq("run_id", run.id)
                .eq("step_id", step.id)
                .maybeSingle();
              if (existingSr) {
                stepRecord = existingSr as StepRec;
              } else {
                const { data: newSr } = await sb
                  .from("workflow_step_runs")
                  .insert({
                    run_id: run.id,
                    step_id: step.id,
                    status: mappedStatus ?? "in_progress",
                    started_at: new Date().toISOString(),
                    external_step_id: externalStepId,
                  })
                  .select("id, step_id")
                  .single();
                if (newSr) stepRecord = newSr as StepRec;
              }
            }
          }
        }

        // Update step run if we found one
        if (stepRecord && mappedStatus) {
          const completed =
            mappedStatus === "done" || mappedStatus === "rejected" || mappedStatus === "skipped";
          await sb
            .from("workflow_step_runs")
            .update({
              status: mappedStatus,
              completed_at: completed ? new Date().toISOString() : null,
              notes: body.output ? JSON.stringify(body.output).slice(0, 2000) : undefined,
            })
            .eq("id", stepRecord.id);

          // Fire a Spark on failure
          if (mappedStatus === "rejected" || body.status === "failed") {
            await sb.from("sparks").insert({
              name: `Workflow step failed`,
              content: `External step "${typeof body.step === "string" ? body.step : body.step?.name ?? "unknown"}" failed in run ${run.id}.`,
              generated_by_kind: "agent",
              progression_state: "captured",
              origin_event: `workflow_callback:${run.id}:${stepRecord.id}`,
            });
          }
        }

        // If overall status is terminal, update the run
        if (!body.step && mappedStatus) {
          const runStatus =
            mappedStatus === "done"
              ? "Completed"
              : mappedStatus === "rejected"
                ? "Failed"
                : mappedStatus === "in_progress"
                  ? "running"
                  : run.status;
          await sb
            .from("workflow_runs")
            .update({ status: runStatus })
            .eq("id", run.id);
        }

        // Stamp last_synced_at on the binding
        await sb
          .from("workflow_execution_bindings")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("workflow_id", run.workflow_id);

        return json({ ok: true, run_id: run.id, step_run_id: stepRecord?.id ?? null });
      },
    },
  },
});

interface CallbackBody {
  external_run_id?: string;
  lovable_run_id?: string;
  step?: string | { name?: string; external_step_id?: string };
  status?: string;
  output?: unknown;
}

const DEFAULT_STATUS_MAP: Record<string, string> = {
  succeeded: "done",
  success: "done",
  ok: "done",
  done: "done",
  completed: "done",
  failed: "rejected",
  error: "rejected",
  rejected: "rejected",
  running: "in_progress",
  in_progress: "in_progress",
  pending: "pending",
  skipped: "skipped",
};

function mapStatus(input: string | undefined, custom: Record<string, string>): string | null {
  if (!input) return null;
  const lower = input.toLowerCase();
  return custom[lower] ?? custom[input] ?? DEFAULT_STATUS_MAP[lower] ?? null;
}

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

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
