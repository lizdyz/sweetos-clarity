// Generate lens perspectives + crib sheet for a (subject_kind, subject_id).
// Calls Lovable AI Gateway with tool-calling for structured output, caches into
// lens_perspectives + entity_crib_sheets. Per-stage breakdown + editable prompts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "google/gemini-2.5-flash";

interface Body {
  subject_kind: "domain" | "tenet" | "component" | "relationship" | "mission" | "project";
  subject_id: string;
  lens_codes?: string[];
  force?: boolean;
}

interface LensRow {
  id: string;
  code: string;
  name: string;
  tagline: string;
  what_it_asks: string | null;
  best_use: string | null;
  stages: string[];
  system_prompt: string | null;
  user_prompt_template: string | null;
  model: string | null;
}

function perspectiveTool(stages: string[]) {
  return {
    type: "function" as const,
    function: {
      name: "emit_lens_perspective",
      description: "Emit a structured per-stage Lens perspective on the subject.",
      parameters: {
        type: "object",
        properties: {
          quick_facts: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
          stages_breakdown: {
            type: "array",
            description: `Exactly one entry per stage, in order: ${stages.join(" → ")}`,
            minItems: stages.length,
            maxItems: stages.length,
            items: {
              type: "object",
              properties: {
                stage: { type: "string", description: "Stage name (must match the lens stages)" },
                summary: { type: "string", description: "1-2 sentence summary for this stage." },
                bullets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
                watch_outs: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
                next_actions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
              },
              required: ["stage", "summary", "bullets", "watch_outs", "next_actions"],
              additionalProperties: false,
            },
          },
          key_questions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
          watch_outs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
          next_actions: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        },
        required: ["quick_facts", "stages_breakdown", "key_questions", "watch_outs", "next_actions"],
        additionalProperties: false,
      },
    },
  };
}

const cribTool = {
  type: "function" as const,
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

async function callGateway(
  systemPrompt: string,
  userPrompt: string,
  // deno-lint-ignore no-explicit-any
  tool: any,
  apiKey: string,
  model: string,
) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
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

function defaultSystemPrompt(lens: LensRow): string {
  return `You are the ${lens.name} BizzyBot — the embodiment of the ${lens.name} Lens (${lens.tagline}).
Your stages are: ${lens.stages.join(" → ")}.
What you ask: ${lens.what_it_asks ?? ""}
Best use: ${lens.best_use ?? ""}

You must walk the subject through YOUR stages, producing ONE structured entry per stage. Be specific, operational, and grounded in the subject's actual content. Avoid generic advice. Use concrete language. Keep each stage's bullets tight and punchy.`;
}

function defaultUserPrompt(lens: LensRow, subjectKind: string, subjectName: string, subjectDesc: string): string {
  return `Subject (${subjectKind}): ${subjectName}
Description: ${subjectDesc || "(no description provided)"}

Generate your ${lens.name} per-stage perspective. Produce exactly ${lens.stages.length} entries in stages_breakdown, one per stage, in order: ${lens.stages.join(" → ")}.`;
}

function applyTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

// deno-lint-ignore no-explicit-any
function joinStagesAsMarkdown(stages: any[]): string {
  return stages
    // deno-lint-ignore no-explicit-any
    .map((s: any) => {
      const bullets = (s.bullets ?? []).map((b: string) => `- ${b}`).join("\n");
      return `## ${s.stage}\n${s.summary}\n\n${bullets}`;
    })
    .join("\n\n");
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

    let lensQuery = supabase.from("lenses").select("*").eq("enabled", true).order("sort_order");
    if (lens_codes && lens_codes.length) lensQuery = lensQuery.in("code", lens_codes);
    const { data: lenses, error: lensErr } = await lensQuery;
    if (lensErr) throw lensErr;
    if (!lenses?.length) throw new Error("No lenses found");

    // deno-lint-ignore no-explicit-any
    const generated: Array<{ lens: LensRow; perspective: any; model: string }> = [];

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

      if (existing?.is_pinned && !force) continue;

      const model = lens.model || DEFAULT_MODEL;
      const systemPrompt = lens.system_prompt && lens.system_prompt.trim()
        ? lens.system_prompt
        : defaultSystemPrompt(lens);
      const userPrompt = lens.user_prompt_template && lens.user_prompt_template.trim()
        ? applyTemplate(lens.user_prompt_template, {
            subject_kind,
            subject_name: subjectName,
            subject_description: subjectDesc,
            stages: lens.stages.join(" → "),
          })
        : defaultUserPrompt(lens, subject_kind, subjectName, subjectDesc);

      try {
        const perspective = await callGateway(
          systemPrompt,
          userPrompt,
          perspectiveTool(lens.stages),
          apiKey,
          model,
        );

        const nextVersion = (existing?.version ?? 0) + 1;
        const md = joinStagesAsMarkdown(perspective.stages_breakdown ?? []);

        const { data: inserted, error: insErr } = await supabase
          .from("lens_perspectives")
          .insert({
            lens_id: lens.id,
            subject_kind,
            subject_id,
            quick_facts: perspective.quick_facts,
            perspective_md: md,
            stages_breakdown: perspective.stages_breakdown ?? [],
            key_questions: perspective.key_questions,
            watch_outs: perspective.watch_outs,
            next_actions: perspective.next_actions,
            generated_by_model: model,
            version: nextVersion,
          })
          .select("id")
          .single();
        if (insErr) console.error("Insert lens_perspective error:", insErr);

        // Audit trail
        if (inserted?.id) {
          await supabase.from("entity_audit_log").insert({
            subject_kind: "lens_perspective",
            subject_id: inserted.id,
            change_type: "version",
            field: "stages_breakdown",
            new_value: { lens_code: lens.code, version: nextVersion, stages: lens.stages },
            source: "agent",
            model,
            notes: `Generated ${lens.name} v${nextVersion} for ${subject_kind} ${subjectName}`,
          });
        }

        generated.push({ lens, perspective, model });
      } catch (lensErr) {
        console.error(`Lens ${lens.code} failed:`, lensErr);
      }
    }

    // Crib sheet across perspectives
    const cribSystem = `You consolidate Lens perspectives into a single tight crib sheet for a ${subject_kind}. Be punchy, operational, non-generic. Output structured JSON via the tool call.`;
    const allPerspectivesText = generated
      .map((g) => `### ${g.lens.name}\n${joinStagesAsMarkdown(g.perspective.stages_breakdown ?? [])}\nQuick: ${(g.perspective.quick_facts ?? []).join("; ")}`)
      .join("\n\n");
    const cribUser = `Subject (${subject_kind}): ${subjectName}
Description: ${subjectDesc || "(none)"}

Lens perspectives:
${allPerspectivesText || "(none generated this pass — base the crib sheet on the subject description alone)"}

Produce the crib sheet.`;

    try {
      const crib = await callGateway(cribSystem, cribUser, cribTool, apiKey, DEFAULT_MODEL);
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
          generated_by_model: DEFAULT_MODEL,
          version: cribVersion,
        });
        if (cribErr) console.error("Insert crib sheet error:", cribErr);
      }
    } catch (cribErr) {
      console.error("Crib generation failed:", cribErr);
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
