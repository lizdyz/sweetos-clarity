// Generate a draft Component Output (email, PRD, newsletter, etc.) using
// Lovable AI Gateway. Reads the matching system prompt from `system_prompts`,
// stitches Component + Persona + Relationship context, and writes a draft
// row into `component_outputs`.
//
// Body: { component_id: string, output_kind: string, title?: string,
//         for_relationship_id?: string, for_persona_id?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  component_id: string;
  output_kind: string;
  title?: string;
  for_relationship_id?: string;
  for_persona_id?: string;
}

function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.component_id || !body.output_kind) {
      return new Response(JSON.stringify({ error: "component_id and output_kind required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const promptKey = `output.${body.output_kind}`;
    const { data: prompt } = await supabase
      .from("system_prompts")
      .select("system_prompt, user_prompt_template, model")
      .eq("key", promptKey)
      .maybeSingle();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: `No system prompt found for key '${promptKey}'. Add one in the Prompt Console.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: component } = await supabase
      .from("components")
      .select("name, description, questions_it_answers")
      .eq("id", body.component_id)
      .maybeSingle();

    if (!component) {
      return new Response(JSON.stringify({ error: "Component not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let personaSummary = "(none)";
    if (body.for_persona_id) {
      const { data: p } = await supabase
        .from("personas")
        .select("name, audience_primary_concern, description")
        .eq("id", body.for_persona_id)
        .maybeSingle();
      if (p) personaSummary = `${p.name}: ${p.audience_primary_concern ?? p.description ?? ""}`;
    }

    let relationshipSummary = "(none)";
    if (body.for_relationship_id) {
      const { data: r } = await supabase
        .from("relationships")
        .select("name")
        .eq("id", body.for_relationship_id)
        .maybeSingle();
      if (r) relationshipSummary = r.name;
    }

    const userPrompt = fillTemplate(prompt.user_prompt_template ?? "", {
      component_name: component.name ?? "",
      component_description: component.description ?? "",
      questions_it_answers: component.questions_it_answers ?? "",
      persona_summary: personaSummary,
      relationship_summary: relationshipSummary,
    });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: prompt.model ?? "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt.system_prompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Lovable AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI gateway error: ${txt}`);
    }

    const ai = await aiRes.json();
    const bodyMd: string = ai.choices?.[0]?.message?.content ?? "";

    const title = body.title ?? `${component.name ?? "Component"} — ${body.output_kind.replace("_", " ")}`;

    const { data: inserted, error: insErr } = await supabase
      .from("component_outputs")
      .insert({
        component_id: body.component_id,
        output_kind: body.output_kind,
        title,
        body_md: bodyMd,
        status: "draft",
        generation_prompt_key: promptKey,
        generated_by_model: prompt.model ?? "google/gemini-2.5-flash",
        generated_at: new Date().toISOString(),
        for_relationship_id: body.for_relationship_id ?? null,
        for_persona_id: body.for_persona_id ?? null,
      } as never)
      .select("id")
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ id: inserted.id, body_md: bodyMd }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
