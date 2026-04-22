// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  domain_id?: string;
  tenet_id?: string;
  query: string;
  sources?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.query) throw new Error("query is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Load domain context
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

    // Load editable prompt from system_prompts
    const { data: prompt } = await sb.from("system_prompts").select("*").eq("key", "signal.scan").maybeSingle();
    const systemPrompt = (prompt as any)?.system_prompt ??
      "You synthesize external best-practice signals into concrete checklist items. Each proposal must include text, rationale, source_url, confidence (0-1).";
    const model = (prompt as any)?.model ?? "google/gemini-2.5-flash";

    const userPrompt = `Domain: ${domainName}
Existing checklist items:
${existing.map((s) => `- ${s}`).join("\n") || "(none)"}

Query: ${body.query}
${body.sources?.length ? `Sources to consider:\n${body.sources.join("\n")}` : ""}

Return strict JSON: { "proposals": [{ "proposed_text": string, "rationale": string, "source_url": string, "source_snippet": string, "confidence": number }] }
Suggest 3-5 distinct, high-quality items that are NOT already in the existing checklist.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
    let parsed: { proposals?: Array<{ proposed_text: string; rationale?: string; source_url?: string; source_snippet?: string; confidence?: number }> };
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
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
