// Distill Brand Canon from Vault documents.
// Reads selected vault items (capture_attachments with extracted_text),
// asks the AI gateway to propose canon fields, and stages the result in
// `narrative_distill_proposals` for human review.
//
// Body: {
//   relationship_id?: string,
//   component_id?: string,
//   brand_canon_id?: string,        // optional: if updating an existing canon
//   vault_source_ids: string[]      // capture_attachments.id
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { getPrompt, renderTemplate } from "../_shared/get-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  relationship_id?: string;
  component_id?: string;
  brand_canon_id?: string;
  vault_source_ids: string[];
}

const FALLBACK_SYSTEM_PROMPT = `You are a brand-canon distiller. Read the source documents and propose a structured Brand Canon for a narrative production system.

Return STRICT JSON matching this schema (no prose, no markdown):
{
  "voice_attributes": { "tone_words": string[], "signature_openers": string[], "anti_patterns": string[] },
  "narrative_pillars": string[],          // 3-5 core ideas this brand returns to
  "forbidden_phrases": string[],          // phrases the brand avoids
  "forbidden_visuals": string[],          // visual clichés to avoid
  "visual_style": { "palette_hex": string[], "illustration_style": string, "lighting": string, "line_weight": string },
  "rationale": string                     // 2-3 sentences on why these choices fit the source material
}

Be specific. Avoid generic SaaS language. Quote phrases from the source when useful. If a field is unclear from the documents, return an empty array rather than guessing.`;

const FALLBACK_USER_TEMPLATE = `Source documents:\n\n{{source_text}}\n\nReturn the Brand Canon JSON now.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.vault_source_ids?.length) {
      return new Response(JSON.stringify({ error: "vault_source_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.relationship_id && !body.component_id && !body.brand_canon_id) {
      return new Response(
        JSON.stringify({ error: "relationship_id, component_id, or brand_canon_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch source documents
    const { data: sources, error: srcErr } = await supabase
      .from("capture_attachments")
      .select("id, original_name, extracted_text, mime_type")
      .in("id", body.vault_source_ids);
    if (srcErr) throw srcErr;

    const sourceText = (sources ?? [])
      .map((s) => {
        const text = s.extracted_text?.slice(0, 8000) ?? "(no extracted text — binary file)";
        return `--- ${s.original_name} (${s.mime_type ?? "unknown"}) ---\n${text}`;
      })
      .join("\n\n");

    if (!sourceText.trim()) {
      return new Response(
        JSON.stringify({ error: "Selected Vault documents have no extracted text to distill from." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = await getPrompt(supabase, "brand.distill", {
      systemPrompt: FALLBACK_SYSTEM_PROMPT,
      userTemplate: FALLBACK_USER_TEMPLATE,
      model: "google/gemini-2.5-flash",
    });
    const userMessage = renderTemplate(prompt.userTemplate, { source_text: sourceText });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: prompt.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Lovable AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI gateway error: ${txt}`);
    }

    const ai = await aiRes.json();
    const raw: string = ai.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { _raw: raw };
    }

    const rationale = typeof parsed.rationale === "string" ? parsed.rationale : null;
    delete parsed.rationale;

    const { data: inserted, error: insErr } = await supabase
      .from("narrative_distill_proposals")
      .insert({
        brand_canon_id: body.brand_canon_id ?? null,
        relationship_id: body.relationship_id ?? null,
        component_id: body.component_id ?? null,
        vault_source_ids: body.vault_source_ids,
        proposed: parsed,
        rationale,
        status: "pending",
        generated_by_model: model,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ id: inserted.id, proposed: parsed, rationale }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
