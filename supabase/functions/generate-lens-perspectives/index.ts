// Generate lens perspectives + crib sheet for a (subject_kind, subject_id).
// Calls Lovable AI Gateway with tool-calling for structured output, caches into
// lens_perspectives + entity_crib_sheets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";

interface Body {
  subject_kind: "domain" | "tenet" | "component" | "relationship" | "mission" | "project";
  subject_id: string;
  lens_codes?: string[]; // optional subset; default = all enabled
  force?: boolean; // ignore freshness, regenerate
}

interface LensRow {
  id: string;
  code: string;
  name: string;
  tagline: string;
  what_it_asks: string | null;
  best_use: string | null;
  stages: string[];
}

const perspectiveTool = {
  type: "function",
  function: {
    name: "emit_lens_perspective",
    description: "Emit a structured Lens perspective on the subject.",
    parameters: {
      type: "object",
      properties: {
        quick_facts: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        perspective_md: { type: "string", description: "Markdown body walking the subject through this Lens's stages." },
        key_questions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        watch_outs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        next_actions: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
      required: ["quick_facts", "perspective_md", "key_questions", "watch_outs", "next_actions"],
      additionalProperties: false,
    },
  },
};

const cribTool = {
  type: "function",
  function: {
    name: "emit_crib_sheet",
    description: "Emit a top-of-page summary across all Lenses.",
    parameters: {
      type: "object",
      properties: {
        tldr: { type: "string" },
        core_principles: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
        quick_facts: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
        common_pitfalls: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        signature_metrics: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
      },
      required: ["tldr", "core_principles", "quick_facts", "common_pitfalls", "signature_metrics"],
      additionalProperties: false,
    },
  },
};

async function callGateway(systemPrompt: string, userPrompt: string, tool: typeof perspectiveTool, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway ${res.status}: ${text}`);
  }
  const json = await res.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("No tool call returned");
  return JSON.parse(call.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: Body = await req.json();
    const { subject_kind, subject_id, lens_codes, force } = body;
    if (!subject_kind || !subject_id) throw new Error("subject_kind and subject_id required");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Load the subject row for context
    const subjectTable = subject_kind === "tenet" ? "tenets" : subject_kind === "domain" ? "domains" : `${subject_kind}s`;
    const { data: subject, error: subjErr } = await supabase
      .from(subjectTable)
      .select("*")
      .eq("id", subject_id)
      .maybeSingle();
    if (subjErr) throw subjErr;
    if (!subject) throw new Error(`${subject_kind} ${subject_id} not found`);
    const subjectName = subject.name ?? subject.title ?? subject_id;
    const subjectDesc = subject.description ?? "";

    // 2. Load lenses
    let lensQuery = supabase.from("lenses").select("*").eq("enabled", true).order("sort_order");
    if (lens_codes && lens_codes.length) lensQuery = lensQuery.in("code", lens_codes);
    const { data: lenses, error: lensErr } = await lensQuery;
    if (lensErr) throw lensErr;
    if (!lenses?.length) throw new Error("No lenses found");

    const generated: Array<{ lens: LensRow; perspective: any }> = [];

    // 3. For each lens, skip if pinned, otherwise generate
    for (const lens of lenses as LensRow[]) {
      const { data: existing } = await supabase
        .from("lens_perspectives")
        .select("id, version, is_pinned")
        .eq("lens_id", lens.id)
        .eq("subject_kind", subject_kind)
        .eq("subject_id", subject_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.is_pinned && !force) {
        continue;
      }

      const systemPrompt = `You are the ${lens.name} BizzyBot — the embodiment of the ${lens.name} Lens (${lens.tagline}).
Your stages are: ${lens.stages.join(" → ")}.
What you ask: ${lens.what_it_asks ?? ""}
Best use: ${lens.best_use ?? ""}

You must walk the subject through YOUR stages. Be specific, operational, and grounded in the subject's actual content. Avoid generic advice. Use concrete language. Keep markdown tight — short paragraphs and bullets.`;

      const userPrompt = `Subject (${subject_kind}): ${subjectName}
Description: ${subjectDesc || "(no description provided)"}

Generate your ${lens.name} perspective on this ${subject_kind}. Walk it through your stages: ${lens.stages.join(" → ")}.`;

      const perspective = await callGateway(systemPrompt, userPrompt, perspectiveTool, apiKey);

      const nextVersion = (existing?.version ?? 0) + 1;
      const { error: insErr } = await supabase.from("lens_perspectives").insert({
        lens_id: lens.id,
        subject_kind,
        subject_id,
        quick_facts: perspective.quick_facts,
        perspective_md: perspective.perspective_md,
        key_questions: perspective.key_questions,
        watch_outs: perspective.watch_outs,
        next_actions: perspective.next_actions,
        generated_by_model: MODEL,
        version: nextVersion,
      });
      if (insErr) console.error("Insert lens_perspective error:", insErr);

      generated.push({ lens, perspective });
    }

    // 4. Generate consolidated crib sheet from all perspectives
    const cribSystem = `You consolidate eight Lens perspectives into a single tight crib sheet for a ${subject_kind}. Be punchy, operational, non-generic. Output structured JSON via the tool call.`;
    const allPerspectivesText = generated
      .map((g) => `### ${g.lens.name}\n${g.perspective.perspective_md}\nQuick: ${g.perspective.quick_facts.join("; ")}`)
      .join("\n\n");
    const cribUser = `Subject (${subject_kind}): ${subjectName}
Description: ${subjectDesc || "(none)"}

Lens perspectives:
${allPerspectivesText || "(none generated this pass — base the crib sheet on the subject description alone)"}

Produce the crib sheet.`;

    const crib = await callGateway(cribSystem, cribUser, cribTool, apiKey);

    const { data: existingCrib } = await supabase
      .from("entity_crib_sheets")
      .select("id, version, is_pinned")
      .eq("subject_kind", subject_kind)
      .eq("subject_id", subject_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingCrib?.is_pinned || force) {
      const cribVersion = (existingCrib?.version ?? 0) + 1;
      const { error: cribErr } = await supabase.from("entity_crib_sheets").insert({
        subject_kind,
        subject_id,
        tldr: crib.tldr,
        core_principles: crib.core_principles,
        quick_facts: crib.quick_facts,
        common_pitfalls: crib.common_pitfalls,
        signature_metrics: crib.signature_metrics,
        generated_by_model: MODEL,
        version: cribVersion,
      });
      if (cribErr) console.error("Insert crib sheet error:", cribErr);
    }

    return new Response(
      JSON.stringify({ ok: true, generated_count: generated.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-lens-perspectives error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Gateway 429") ? 429 : msg.includes("Gateway 402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
