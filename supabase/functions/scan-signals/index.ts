// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPrompt, renderTemplate } from "../_shared/get-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RubricBody {
  mode?: "rubric";
  domain_id?: string;
  tenet_id?: string;
  query: string;
  sources?: string[];
}

interface KtiBody {
  mode: "kti";
  kti_id: string;
  sources?: string[];
}

type Body = RubricBody | KtiBody;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    if (body.mode === "kti") {
      return await runKtiScan(sb, lovableKey, body);
    }
    return await runRubricScan(sb, lovableKey, body as RubricBody);
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── KTI mode ────────────────────────────────────────────────────────────────
async function runKtiScan(sb: any, lovableKey: string, body: KtiBody) {
  if (!body.kti_id) throw new Error("kti_id is required");

  const { data: kti, error: ktiErr } = await sb
    .from("key_trend_indicators")
    .select(
      "id, name, description, threshold_definition, scan_frequency, domain:domains(name), relationship:relationships(name)",
    )
    .eq("id", body.kti_id)
    .maybeSingle();
  if (ktiErr) throw ktiErr;
  if (!kti) throw new Error("KTI not found");

  const systemPrompt =
    "You are a forward-looking signal evaluator. Given a Key Trend Indicator with a threshold definition, evaluate whether recent external signals indicate the threshold has been crossed. Respond with strict JSON: { \"observed_value\": string, \"direction\": \"up\"|\"down\"|\"flat\"|\"fired\"|\"unknown\", \"fired\": boolean, \"notes\": string }. Be conservative — only mark fired=true when the threshold is genuinely crossed.";

  const userPrompt = `KTI: ${kti.name}
Domain: ${kti.domain?.name ?? "—"}
Scoped to: ${kti.relationship?.name ?? "Universal"}
Threshold: ${kti.threshold_definition}
${kti.description ? `Context: ${kti.description}` : ""}
${body.sources?.length ? `Sources to consider:\n${body.sources.join("\n")}` : "Use general public knowledge of recent trends in this domain."}

Evaluate the current state of this signal and return the JSON.`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!aiRes.ok) {
    const text = await aiRes.text();
    throw new Error(`AI gateway: ${aiRes.status} ${text}`);
  }
  const ai = await aiRes.json();
  const content = ai.choices?.[0]?.message?.content ?? "{}";
  let parsed: { observed_value?: string; direction?: string; fired?: boolean; notes?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  const allowedDir = new Set(["up", "down", "flat", "fired", "unknown"]);
  const direction = parsed.direction && allowedDir.has(parsed.direction) ? parsed.direction : "unknown";
  const fired = !!parsed.fired || direction === "fired";

  const { data: scan, error: insErr } = await sb
    .from("kti_scans")
    .insert({
      kti_id: body.kti_id,
      observed_value: parsed.observed_value ?? null,
      direction,
      fired,
      notes: parsed.notes ?? null,
      evidence: { ai_raw: parsed },
    })
    .select("id, fired, direction")
    .single();
  if (insErr) throw insErr;

  return new Response(JSON.stringify({ ok: true, scan }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Rubric mode (existing behavior) ─────────────────────────────────────────
async function runRubricScan(sb: any, lovableKey: string, body: RubricBody) {
  if (!body.query) throw new Error("query is required");

  let domainName = "Unknown";
  let existing: string[] = [];
  if (body.domain_id) {
    const { data: d } = await sb.from("domains").select("name").eq("id", body.domain_id).maybeSingle();
    if (d) domainName = (d as any).name;
    const { data: rubric } = await sb
      .from("excellence_rubric")
      .select("checklist_items")
      .eq("subject_kind", "domain")
      .eq("subject_id", body.domain_id);
    existing = ((rubric ?? []) as Array<{ checklist_items: string[] }>)
      .flatMap((r) => r.checklist_items ?? []);
  }

  const FALLBACK_SYSTEM = "You synthesize external best-practice signals into concrete checklist items. Each proposal must include text, rationale, source_url, confidence (0-1).";
  const FALLBACK_USER = `Domain: {{domain_name}}
Existing checklist items:
{{existing_items}}

Query: {{query}}
{{sources_block}}

Return strict JSON: { "proposals": [{ "proposed_text": string, "rationale": string, "source_url": string, "source_snippet": string, "confidence": number }] }
Suggest 3-5 distinct, high-quality items that are NOT already in the existing checklist.`;

  const prompt = await getPrompt(sb, "signals.scan.classify", {
    systemPrompt: FALLBACK_SYSTEM,
    userTemplate: FALLBACK_USER,
    model: "google/gemini-2.5-flash",
  });

  const userPrompt = renderTemplate(prompt.userTemplate, {
    domain_name: domainName,
    existing_items: existing.map((s) => `- ${s}`).join("\n") || "(none)",
    query: body.query,
    sources_block: body.sources?.length ? `Sources to consider:\n${body.sources.join("\n")}` : "",
  });

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: prompt.model,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!aiRes.ok) {
    const text = await aiRes.text();
    throw new Error(`AI gateway: ${aiRes.status} ${text}`);
  }

  const ai = await aiRes.json();
  const content = ai.choices?.[0]?.message?.content ?? "{}";
  let parsed: {
    proposals?: Array<{
      proposed_text: string;
      rationale?: string;
      source_url?: string;
      source_snippet?: string;
      confidence?: number;
    }>;
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { proposals: [] };
  }

  const rows = (parsed.proposals ?? []).map((p) => ({
    domain_id: body.domain_id ?? null,
    tenet_id: body.tenet_id ?? null,
    proposed_text: p.proposed_text,
    rationale: p.rationale ?? null,
    source_url: p.source_url ?? null,
    source_snippet: p.source_snippet ?? null,
    confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
    status: "pending",
  }));

  let inserted = 0;
  if (rows.length > 0) {
    const { error, count } = await sb.from("excellence_checklist_proposals").insert(rows, { count: "exact" });
    if (error) throw error;
    inserted = count ?? rows.length;
  }

  return new Response(JSON.stringify({ proposals_created: inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
