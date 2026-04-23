import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { getPrompt, renderTemplate } from "@/utils/prompts.server";

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
      inferred_industry_slug: {
        type: "string",
        description: "If the input clearly implies an industry (e.g. financial-advisory, legal, accounting, coaching, consulting), include its slug.",
      },
    },
    required: ["entity_type", "proposed_fields", "confidence"],
    additionalProperties: false,
  },
} as const;

const TAG_SUGGESTER_SCHEMA = {
  name: "suggest_tags",
  description: "Pick the most relevant Domains, Tenets, and Components for this proposal from the supplied canon.",
  parameters: {
    type: "object",
    properties: {
      tagged_domains: {
        type: "array",
        items: { type: "string" },
        description: "Domain slugs that apply (from the provided canon). 0–5 items.",
      },
      tagged_tenets: {
        type: "array",
        items: { type: "string" },
        description: "Tenet slugs that apply (from the provided canon). 0–5 items.",
      },
      tagged_components: {
        type: "array",
        items: { type: "string" },
        description: "Component UUIDs that apply (from the provided canon). 0–5 items.",
      },
      confidence_per_tag: {
        type: "object",
        description: "Optional map of slug/uuid -> confidence (0–1).",
        additionalProperties: { type: "number" },
      },
    },
    required: ["tagged_domains", "tagged_tenets", "tagged_components"],
    additionalProperties: false,
  },
} as const;

async function callAI(body: Record<string, unknown>) {
  if (!LOVABLE_API_KEY) throw new Error("AI gateway not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI rate limit — try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted — add funds in Settings → Workspace → Usage.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  return res.json();
}

async function callNormalizer(text: string, defaultModel: string) {
  const prompt = await getPrompt("capture.parse", {
    systemPrompt:
      "You are the SweetBOS intake normalizer. Read messy human input and return ONE structured proposal. Pick the single best entity_type. Extract concrete fields (name, description, status, owner, etc.) when present. Never invent data — leave fields out if unclear. Keep 'name' short and human. If the content clearly implies an industry niche, set inferred_industry_slug.",
    userTemplate: "{{text}}",
    model: defaultModel,
  });
  const json = await callAI({
    model: prompt.model,
    messages: [
      { role: "system", content: prompt.systemPrompt },
      { role: "user", content: renderTemplate(prompt.userTemplate, { text }) },
    ],
    tools: [{ type: "function", function: NORMALIZER_SCHEMA }],
    tool_choice: { type: "function", function: { name: "stage_proposal" } },
  });
  const call = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!call) throw new Error("AI returned no structured output");
  return JSON.parse(call) as {
    entity_type: (typeof ENTITY_TYPES)[number];
    proposed_fields: Record<string, unknown>;
    confidence: number;
    reasoning?: string;
    conflicts?: string[];
    inferred_industry_slug?: string;
  };
}

// ---------- Pollination passes (Wave 12) ----------
// Each returns a small JSON object. They share a common "JSON-only response" call.

async function callJsonAI(opts: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<Record<string, unknown> | null> {
  try {
    const json = await callAI({
      model: opts.model,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      response_format: { type: "json_object" },
    });
    const text = json?.choices?.[0]?.message?.content;
    if (!text) return null;
    const cleaned = String(text).trim().replace(/^```json\s*|\s*```$/g, "");
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("callJsonAI failed:", e);
    return null;
  }
}

async function classifyIntent(text: string, defaultModel: string): Promise<string | null> {
  const prompt = await getPrompt("capture.intent", {
    systemPrompt:
      'You classify raw user captures into one canonical intent. Reply with JSON: {"intent":"observation|jtbd|task|question|trend_signal|client_update|idea","confidence":0..1,"reason":"..."}.',
    userTemplate: "Input:\n{{text}}\n\nReturn JSON only.",
    model: defaultModel,
  });
  const out = await callJsonAI({
    model: prompt.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: renderTemplate(prompt.userTemplate, { text }),
  });
  const intent = typeof out?.intent === "string" ? out.intent : null;
  return intent;
}

async function matchPersonas(
  text: string,
  personas: Array<{ id: string; name: string; sector: string | null }>,
  defaultModel: string,
): Promise<string[]> {
  if (!personas.length) return [];
  const prompt = await getPrompt("capture.match.persona", {
    systemPrompt:
      'You match capture text against a persona library. Reply with JSON: {"matches":[{"persona_id":"uuid","why":"...","confidence":0..1}]}. Only include genuine matches (confidence >= 0.5).',
    userTemplate:
      "Input:\n{{text}}\n\nPersona library (JSON):\n{{personas_json}}\n\nReturn JSON only.",
    model: defaultModel,
  });
  const out = await callJsonAI({
    model: prompt.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: renderTemplate(prompt.userTemplate, {
      text,
      personas_json: JSON.stringify(personas),
    }),
  });
  const matches = Array.isArray(out?.matches) ? (out.matches as Array<{ persona_id?: string }>) : [];
  const valid = new Set(personas.map((p) => p.id));
  return matches.map((m) => m.persona_id ?? "").filter((id) => valid.has(id));
}

async function matchJTBDs(
  text: string,
  jtbds: Array<{ id: string; statement: string; persona_id: string | null }>,
  defaultModel: string,
): Promise<string[]> {
  if (!jtbds.length) return [];
  const prompt = await getPrompt("capture.match.jtbd", {
    systemPrompt:
      'You match a capture against a JTBD library scoped to the matched personas. Reply with JSON: {"matches":[{"jtbd_id":"uuid","why":"...","confidence":0..1}]}. Only include genuine matches.',
    userTemplate:
      "Input:\n{{text}}\n\nJTBD library (JSON, already scoped to relevant personas):\n{{jtbds_json}}\n\nReturn JSON only.",
    model: defaultModel,
  });
  const out = await callJsonAI({
    model: prompt.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: renderTemplate(prompt.userTemplate, {
      text,
      jtbds_json: JSON.stringify(jtbds),
    }),
  });
  const matches = Array.isArray(out?.matches) ? (out.matches as Array<{ jtbd_id?: string }>) : [];
  const valid = new Set(jtbds.map((j) => j.id));
  return matches.map((m) => m.jtbd_id ?? "").filter((id) => valid.has(id));
}

async function matchQuestsAndSparks(
  text: string,
  quests: Array<{ id: string; name: string }>,
  sparks: Array<{ id: string; name: string }>,
  defaultModel: string,
): Promise<{ quests: string[]; sparks: string[] }> {
  if (!quests.length && !sparks.length) return { quests: [], sparks: [] };
  const prompt = await getPrompt("capture.match.quest_spark", {
    systemPrompt:
      'You match a capture against open Quests and Sparks. Reply with JSON: {"quests":[{"id":"uuid","why":"..."}],"sparks":[{"id":"uuid","why":"..."}]}.',
    userTemplate:
      "Input:\n{{text}}\n\nOpen quests (JSON):\n{{quests_json}}\n\nOpen sparks (JSON):\n{{sparks_json}}\n\nReturn JSON only.",
    model: defaultModel,
  });
  const out = await callJsonAI({
    model: prompt.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: renderTemplate(prompt.userTemplate, {
      text,
      quests_json: JSON.stringify(quests),
      sparks_json: JSON.stringify(sparks),
    }),
  });
  const qOut = Array.isArray(out?.quests) ? (out.quests as Array<{ id?: string }>) : [];
  const sOut = Array.isArray(out?.sparks) ? (out.sparks as Array<{ id?: string }>) : [];
  const validQ = new Set(quests.map((q) => q.id));
  const validS = new Set(sparks.map((s) => s.id));
  return {
    quests: qOut.map((m) => m.id ?? "").filter((id) => validQ.has(id)),
    sparks: sOut.map((m) => m.id ?? "").filter((id) => validS.has(id)),
  };
}

async function matchKTIs(
  text: string,
  ktis: Array<{ id: string; name: string; threshold_definition: string }>,
  defaultModel: string,
): Promise<string[]> {
  if (!ktis.length) return [];
  const prompt = await getPrompt("capture.match.kti", {
    systemPrompt:
      'You flag active KTIs whose watching patterns this capture provides evidence for. Reply with JSON: {"matches":[{"kti_id":"uuid","evidence":"...","fires":true|false}]}.',
    userTemplate:
      "Input:\n{{text}}\n\nActive KTIs (JSON):\n{{ktis_json}}\n\nReturn JSON only.",
    model: defaultModel,
  });
  const out = await callJsonAI({
    model: prompt.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: renderTemplate(prompt.userTemplate, {
      text,
      ktis_json: JSON.stringify(ktis),
    }),
  });
  const matches = Array.isArray(out?.matches) ? (out.matches as Array<{ kti_id?: string }>) : [];
  const valid = new Set(ktis.map((k) => k.id));
  return matches.map((m) => m.kti_id ?? "").filter((id) => valid.has(id));
}

async function suggestKTI(
  text: string,
  intent: string | null,
  defaultModel: string,
): Promise<Record<string, unknown> | null> {
  // Only run for trend-signal-shaped intents
  if (intent !== "trend_signal" && intent !== "observation") return null;
  const prompt = await getPrompt("capture.suggest.kti", {
    systemPrompt:
      'When the capture looks like a recurring outside-in trend signal, propose a new KTI to add to the Watchlist. Reply with JSON: {"suggested":true|false,"name":"...","what_to_watch":"...","threshold":"...","trigger_action":"task|bot_alert|all","reason":"..."}. Set suggested=false if it is a one-off.',
    userTemplate: "Input:\n{{text}}\n\nIntent: {{intent}}\n\nReturn JSON only.",
    model: defaultModel,
  });
  const out = await callJsonAI({
    model: prompt.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: renderTemplate(prompt.userTemplate, { text, intent: intent ?? "unknown" }),
  });
  if (!out || out.suggested !== true) return null;
  return out;
}

interface DomainCanon { slug: string; name: string; description: string | null }
interface TenetCanon { slug: string; name: string; category: string | null; industry_slug: string | null }
interface ComponentCanon { id: string; name: string }

async function callTagSuggester(opts: {
  text: string;
  entityType: string;
  proposedFields: Record<string, unknown>;
  domains: DomainCanon[];
  tenets: TenetCanon[];
  components: ComponentCanon[];
  model: string;
}) {
  const { text, entityType, proposedFields, domains, tenets, components, model } = opts;
  const canonText = [
    "DOMAINS (slug — name — description):",
    ...domains.map((d) => `  ${d.slug} — ${d.name}${d.description ? ` — ${d.description}` : ""}`),
    "",
    "TENETS (slug — name — category — industry):",
    ...tenets.map((t) => `  ${t.slug} — ${t.name} — ${t.category ?? "?"} — ${t.industry_slug ?? "universal"}`),
    "",
    "RECENT COMPONENTS (uuid — name):",
    ...components.map((c) => `  ${c.id} — ${c.name}`),
  ].join("\n");

  const tagPrompt = await getPrompt("queue.tag", {
    systemPrompt:
      "You assign taxonomy tags to a proposal. Pick ONLY from the supplied canon. Be precise — fewer, accurate tags beat many loose ones. Prefer 1–3 domains, 1–3 tenets, 0–2 components. Return slugs/uuids exactly as given.",
    userTemplate:
      "Proposal entity_type: {{entity_type}}\nProposed fields: {{fields_json}}\n\nUser text:\n{{text}}\n\n--- CANON ---\n{{canon}}",
    model,
  });
  const json = await callAI({
    model: tagPrompt.model,
    messages: [
      { role: "system", content: tagPrompt.systemPrompt },
      {
        role: "user",
        content: renderTemplate(tagPrompt.userTemplate, {
          entity_type: entityType,
          fields_json: JSON.stringify(proposedFields),
          text: text.slice(0, 4000),
          canon: canonText,
        }),
      },
    ],
    tools: [{ type: "function", function: TAG_SUGGESTER_SCHEMA }],
    tool_choice: { type: "function", function: { name: "suggest_tags" } },
  });
  const call = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!call) return { tagged_domains: [], tagged_tenets: [], tagged_components: [], confidence_per_tag: {} };
  const parsed = JSON.parse(call) as {
    tagged_domains: string[];
    tagged_tenets: string[];
    tagged_components: string[];
    confidence_per_tag?: Record<string, number>;
  };
  // Filter to canon to be safe
  const dSet = new Set(domains.map((d) => d.slug));
  const tSet = new Set(tenets.map((t) => t.slug));
  const cSet = new Set(components.map((c) => c.id));
  return {
    tagged_domains: (parsed.tagged_domains ?? []).filter((s) => dSet.has(s)),
    tagged_tenets: (parsed.tagged_tenets ?? []).filter((s) => tSet.has(s)),
    tagged_components: (parsed.tagged_components ?? []).filter((s) => cSet.has(s)),
    confidence_per_tag: parsed.confidence_per_tag ?? {},
  };
}

export const captureProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CaptureInput.parse(input))
  .handler(async ({ data }) => {
    const { sb, userId } = await requireUser();
    const model = data.model || "google/gemini-3-flash-preview";

    const attachmentNotes = (data.attachments ?? [])
      .map((a) => {
        const txt = a.extracted_text?.trim();
        return txt
          ? `\n\n[Attachment: ${a.original_name}]\n${txt.slice(0, 4000)}`
          : `\n\n[Attached file: ${a.original_name}]`;
      })
      .join("");

    const augmentedText = [data.text, attachmentNotes].join("");

    // Pass 1 — normalize
    const parsed = await callNormalizer(augmentedText, model);

    // Pass 2 — suggest tags from canon
    const [domainsRes, componentsRes, industriesRes] = await Promise.all([
      sb.from("domains").select("slug, name, description").eq("enabled", true).order("sort_order"),
      sb.from("components").select("id, name").order("updated_at", { ascending: false }).limit(40),
      sb.from("industries").select("id, slug").eq("enabled", true),
    ]);

    const industryRows = (industriesRes.data ?? []) as Array<{ id: string; slug: string }>;
    const inferredIndustryId =
      parsed.inferred_industry_slug
        ? industryRows.find((i) => i.slug === parsed.inferred_industry_slug)?.id ?? null
        : null;

    let tenetsQuery = sb.from("tenets").select("slug, name, category, industry_id").eq("enabled", true);
    if (inferredIndustryId) {
      tenetsQuery = tenetsQuery.or(`industry_id.eq.${inferredIndustryId},industry_id.is.null`);
    }
    const tenetsRes = await tenetsQuery.order("sort_order");

    const industryById = new Map(industryRows.map((i) => [i.id, i.slug]));
    const tenetsCanon: TenetCanon[] = ((tenetsRes.data ?? []) as Array<{
      slug: string; name: string; category: string | null; industry_id: string | null;
    }>).map((t) => ({
      slug: t.slug,
      name: t.name,
      category: t.category,
      industry_slug: t.industry_id ? industryById.get(t.industry_id) ?? null : null,
    }));

    let suggestion = { tagged_domains: [] as string[], tagged_tenets: [] as string[], tagged_components: [] as string[], confidence_per_tag: {} as Record<string, number> };
    try {
      suggestion = await callTagSuggester({
        text: augmentedText,
        entityType: parsed.entity_type,
        proposedFields: parsed.proposed_fields,
        domains: (domainsRes.data ?? []) as DomainCanon[],
        tenets: tenetsCanon,
        components: ((componentsRes.data ?? []) as ComponentCanon[]),
        model,
      });
    } catch (e) {
      console.error("tag suggester failed:", e);
    }

    // Match existing record by name
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
        tagged_domains: suggestion.tagged_domains,
        tagged_tenets: suggestion.tagged_tenets,
        tagged_components: suggestion.tagged_components,
        tag_suggestions: {
          confidence_per_tag: suggestion.confidence_per_tag,
          inferred_industry_slug: parsed.inferred_industry_slug ?? null,
        } as never,
        created_by: userId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const proposalRow = row as { id: string };

    if (data.attachments?.length) {
      await sb.from("capture_attachments").insert(
        data.attachments.map((a) => ({
          proposal_id: proposalRow.id,
          storage_path: a.storage_path,
          original_name: a.original_name,
          mime_type: a.mime_type ?? null,
          size_bytes: a.size_bytes ?? null,
          created_by: userId,
        })) as never,
      );
    }

    return { proposal: row };
  });

// ---------- Update proposal tags before approve ----------

const UpdateTagsInput = z.object({
  id: z.string().uuid(),
  tagged_domains: z.array(z.string()).max(50).optional(),
  tagged_tenets: z.array(z.string()).max(50).optional(),
  tagged_components: z.array(z.string().uuid()).max(50).optional(),
});

export const updateProposalTags = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdateTagsInput.parse(input))
  .handler(async ({ data }) => {
    const { sb } = await requireUser();
    const patch: Record<string, unknown> = {};
    if (data.tagged_domains !== undefined) patch.tagged_domains = data.tagged_domains;
    if (data.tagged_tenets !== undefined) patch.tagged_tenets = data.tagged_tenets;
    if (data.tagged_components !== undefined) patch.tagged_components = data.tagged_components;
    const { error } = await sb.from("proposals").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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

    const nf = nameField(table);
    if (fields.name && nf !== "name" && !fields[nf]) {
      fields[nf] = fields.name;
      delete fields.name;
    }

    const propTyped = prop as unknown as {
      tagged_domains?: string[] | null;
      tagged_tenets?: string[] | null;
      tagged_components?: string[] | null;
    };
    const tagPayload = {
      tagged_domains: propTyped.tagged_domains ?? [],
      tagged_tenets: propTyped.tagged_tenets ?? [],
      tagged_components: propTyped.tagged_components ?? [],
    };

    let writtenId: string;

    if (data.mergeIntoId) {
      const { data: updated, error: uErr } = await sb
        .from(table as never)
        .update({
          ...fields,
          ...tagPayload,
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
          ...tagPayload,
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

    await sb
      .from("capture_attachments")
      .update({ entity_table: table, entity_id: writtenId } as never)
      .eq("proposal_id", data.id);

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
