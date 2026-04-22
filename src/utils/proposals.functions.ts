import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY ?? "";

function userClient(token: string) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function requireUser() {
  const authHeader = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
  if (!authHeader) throw new Error("Not authenticated");
  const token = authHeader.replace(/^Bearer /i, "");
  const sb = userClient(token);
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return { sb, userId: data.user.id };
}

const ENTITY_TYPES = [
  "persona", "relationship", "campaign", "project", "task",
  "session", "document", "decision", "spark", "quest",
  "component", "workflow", "journey", "mission", "outcome",
  "domain_assessment", "delegation", "playbook",
] as const;

const ENTITY_TABLE: Record<(typeof ENTITY_TYPES)[number], string> = {
  persona: "personas",
  relationship: "relationships",
  campaign: "campaigns",
  project: "projects",
  task: "tasks",
  session: "sessions",
  document: "documents",
  decision: "decisions",
  spark: "sparks",
  quest: "quests",
  component: "components",
  workflow: "workflows",
  journey: "journeys",
  mission: "missions",
  outcome: "outcomes",
  domain_assessment: "domain_assessments",
  delegation: "delegation",
  playbook: "playbooks",
};

const NAME_FIELD: Record<string, string> = {
  campaigns: "campaign_name",
  delegation: "task_or_responsibility",
  domain_assessments: "domain",
  outcomes: "outcome_type",
  decisions: "decision",
};

function nameField(table: string) {
  return NAME_FIELD[table] ?? "name";
}

// ---------- Capture: text -> AI -> proposal ----------

const AttachmentInput = z.object({
  storage_path: z.string().min(1),
  original_name: z.string().min(1),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  extracted_text: z.string().optional(),
});

const CaptureInput = z.object({
  text: z.string().trim().min(2).max(8000),
  source: z.enum(["capture", "external_ai"]).default("capture"),
  sourceLabel: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  attachments: z.array(AttachmentInput).max(20).optional(),
  tagged_domains: z.array(z.string()).max(50).optional(),
  tagged_tenets: z.array(z.string()).max(50).optional(),
  tagged_components: z.array(z.string().uuid()).max(50).optional(),
});

const NORMALIZER_SCHEMA = {
  name: "stage_proposal",
  description:
    "Convert messy unstructured input into a single structured SweetBOS proposal.",
  parameters: {
    type: "object",
    properties: {
      entity_type: {
        type: "string",
        enum: ENTITY_TYPES as unknown as string[],
        description: "Best-fit SweetBOS entity for this input.",
      },
      proposed_fields: {
        type: "object",
        description:
          "Flat key/value map of fields. Always include a 'name' (or natural label).",
        additionalProperties: true,
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "How confident the parse is (0-1).",
      },
      reasoning: { type: "string", description: "One short sentence explaining the choice." },
      conflicts: {
        type: "array",
        items: { type: "string" },
        description: "Plain-English notes about contradictions or missing info.",
      },
    },
    required: ["entity_type", "proposed_fields", "confidence"],
    additionalProperties: false,
  },
} as const;

async function callNormalizer(text: string, model: string) {
  if (!LOVABLE_API_KEY) throw new Error("AI gateway not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are the SweetBOS intake normalizer. Read messy human input and return ONE structured proposal. Pick the single best entity_type. Extract concrete fields (name, description, status, owner, etc.) when present. Never invent data — leave fields out if unclear. Keep 'name' short and human.",
        },
        { role: "user", content: text },
      ],
      tools: [{ type: "function", function: NORMALIZER_SCHEMA }],
      tool_choice: { type: "function", function: { name: "stage_proposal" } },
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit — try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted — add funds in Settings → Workspace → Usage.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const json = await res.json();
  const call = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!call) throw new Error("AI returned no structured output");
  return JSON.parse(call) as {
    entity_type: (typeof ENTITY_TYPES)[number];
    proposed_fields: Record<string, unknown>;
    confidence: number;
    reasoning?: string;
    conflicts?: string[];
  };
}

export const captureProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CaptureInput.parse(input))
  .handler(async ({ data }) => {
    const { sb, userId } = await requireUser();
    const model = data.model || "google/gemini-3-flash-preview";
    const parsed = await callNormalizer(data.text, model);

    // Try to find an existing record by name fuzzy match
    const table = ENTITY_TABLE[parsed.entity_type];
    const nf = nameField(table);
    const candidateName = String(parsed.proposed_fields?.[nf] ?? parsed.proposed_fields?.name ?? "").trim();

    let matchedId: string | null = null;
    if (candidateName.length > 1) {
      const { data: matches } = await sb
        .from(table as never)
        .select(`id, ${nf}`)
        .ilike(nf, `%${candidateName.slice(0, 40)}%`)
        .limit(1);
      const first = (matches as Array<{ id: string }> | null)?.[0];
      if (first) matchedId = first.id;
    }

    const { data: row, error } = await sb
      .from("proposals")
      .insert({
        entity_type: parsed.entity_type,
        status: "pending",
        source: data.source,
        source_label: data.sourceLabel ?? null,
        raw_input: data.text,
        proposed_fields: parsed.proposed_fields as never,
        confidence: Math.max(0, Math.min(1, parsed.confidence)) as never,
        conflicts: (parsed.conflicts ?? []) as never,
        ai_model: model,
        ai_notes: parsed.reasoning ?? null,
        matched_record_id: matchedId,
        matched_record_table: matchedId ? table : null,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { proposal: row };
  });

// ---------- Approve / Reject ----------

const ApproveInput = z.object({
  id: z.string().uuid(),
  fieldOverrides: z.record(z.string(), z.unknown()).optional(),
  mergeIntoId: z.string().uuid().optional(),
});

export const approveProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ApproveInput.parse(input))
  .handler(async ({ data }) => {
    const { sb, userId } = await requireUser();

    const { data: prop, error: pErr } = await sb
      .from("proposals")
      .select("*")
      .eq("id", data.id)
      .single();
    if (pErr || !prop) throw new Error(pErr?.message || "Proposal not found");
    if (prop.status !== "pending" && prop.status !== "held") {
      throw new Error(`Proposal is already ${prop.status}`);
    }

    const table = ENTITY_TABLE[prop.entity_type as (typeof ENTITY_TYPES)[number]];
    const fields: Record<string, unknown> = {
      ...((prop.proposed_fields as Record<string, unknown>) ?? {}),
      ...(data.fieldOverrides ?? {}),
    };

    // Normalize "name" field key
    const nf = nameField(table);
    if (fields.name && nf !== "name" && !fields[nf]) {
      fields[nf] = fields.name;
      delete fields.name;
    }

    let writtenId: string;

    if (data.mergeIntoId) {
      const { data: updated, error: uErr } = await sb
        .from(table as never)
        .update({
          ...fields,
          source: prop.source,
          source_ref: prop.source_ref,
          confidence: prop.confidence,
          proposal_id: prop.id,
        } as never)
        .eq("id", data.mergeIntoId)
        .select("id")
        .single();
      if (uErr) throw new Error(uErr.message);
      writtenId = (updated as { id: string }).id;
    } else {
      const { data: inserted, error: iErr } = await sb
        .from(table as never)
        .insert({
          ...fields,
          source: prop.source,
          source_ref: prop.source_ref,
          confidence: prop.confidence,
          proposal_id: prop.id,
          created_by: userId,
        } as never)
        .select("id")
        .single();
      if (iErr) throw new Error(iErr.message);
      writtenId = (inserted as { id: string }).id;
    }

    const { error: stampErr } = await sb
      .from("proposals")
      .update({
        status: data.mergeIntoId ? "merged" : "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
        written_record_id: writtenId,
        written_record_table: table,
      })
      .eq("id", data.id);
    if (stampErr) throw new Error(stampErr.message);

    return { ok: true, writtenId, table };
  });

const RejectInput = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export const rejectProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RejectInput.parse(input))
  .handler(async ({ data }) => {
    const { sb } = await requireUser();
    const { error } = await sb
      .from("proposals")
      .update({ status: "rejected", rejected_reason: data.reason ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const HoldInput = z.object({ id: z.string().uuid() });

export const holdProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => HoldInput.parse(input))
  .handler(async ({ data }) => {
    const { sb } = await requireUser();
    const { error } = await sb.from("proposals").update({ status: "held" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
