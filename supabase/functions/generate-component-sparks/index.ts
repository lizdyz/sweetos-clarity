// Generate Sparks for a Component using a 3-tier deterministic-first strategy:
//   Tier 1: Library — match curated spark_templates by journey + maturity. No AI.
//   Tier 2: Adapt   — AI fills {slots} in the closest template (only if 1-2 hits).
//   Tier 3: Generate — full AI generation (only if 0 library hits).
// Each created Spark records its template_id (when applicable) and generation_tier.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SparkProposal = {
  name: string;
  content: string;
  template_id: string | null;
  generation_tier: "template" | "adapted" | "generated";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { componentId } = await req.json();
    if (!componentId) {
      return json({ error: "componentId required" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch component
    const { data: component, error: cErr } = await admin
      .from("components")
      .select("id, name, description, current_maturity_level, journey_id")
      .eq("id", componentId)
      .maybeSingle();
    if (cErr || !component) return json({ error: "Component not found" }, 404);

    // ----- Tier 1: Library lookup -----
    // Templates are eligible if status=active AND
    //  (applicable_components contains this id) OR
    //  (applicable_journeys is empty OR contains this component's journey) AND
    //  (applicable_maturity_levels is empty OR contains current maturity)
    const { data: allActive } = await admin
      .from("spark_templates")
      .select("id, name, body_template, intent, applicable_journeys, applicable_components, applicable_maturity_levels, reuse_count, avg_rating")
      .eq("status", "active");

    const maturity = component.current_maturity_level ?? "L1 Lacking";
    const journeyId = component.journey_id;

    const eligible = (allActive ?? []).filter((t: any) => {
      const journeyOk = !t.applicable_journeys?.length || (journeyId && t.applicable_journeys.includes(journeyId));
      const componentOk = !t.applicable_components?.length || t.applicable_components.includes(component.id);
      const maturityOk = !t.applicable_maturity_levels?.length || t.applicable_maturity_levels.includes(maturity);
      // Direct component match short-circuits journey filter
      const directMatch = t.applicable_components?.includes(component.id);
      return (directMatch || journeyOk) && componentOk && maturityOk;
    });

    // De-dupe against templates already used for this component in last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentUsages } = await admin
      .from("spark_template_usages")
      .select("template_id")
      .eq("component_id", component.id)
      .gte("used_at", since);
    const recentTemplateIds = new Set((recentUsages ?? []).map((u: any) => u.template_id));
    const fresh = eligible.filter((t: any) => !recentTemplateIds.has(t.id));

    // Rank: prefer direct component match, then higher avg_rating, then reuse_count
    fresh.sort((a: any, b: any) => {
      const aDirect = a.applicable_components?.includes(component.id) ? 1 : 0;
      const bDirect = b.applicable_components?.includes(component.id) ? 1 : 0;
      if (aDirect !== bDirect) return bDirect - aDirect;
      const ar = Number(a.avg_rating ?? 0), br = Number(b.avg_rating ?? 0);
      if (ar !== br) return br - ar;
      return (b.reuse_count ?? 0) - (a.reuse_count ?? 0);
    });

    let proposals: SparkProposal[] = [];
    let tier: "template" | "adapted" | "generated" = "template";

    if (fresh.length >= 3) {
      // Tier 1
      proposals = fresh.slice(0, 5).map((t: any) => ({
        name: fillSlots(t.name, component),
        content: fillSlots(t.body_template, component),
        template_id: t.id,
        generation_tier: "template" as const,
      }));
    } else if (fresh.length >= 1) {
      // Tier 2: AI-adapt the slots in available templates
      tier = "adapted";
      const adapted = await adaptTemplates(fresh.slice(0, 3), component, LOVABLE_API_KEY);
      if (adapted.error) return json({ error: adapted.error }, adapted.status);
      proposals = adapted.proposals;
    } else {
      // Tier 3: full AI generation
      tier = "generated";
      const gen = await generateFresh(component, LOVABLE_API_KEY);
      if (gen.error) return json({ error: gen.error }, gen.status);
      proposals = gen.proposals;
    }

    if (!proposals.length) return json({ error: "No proposals produced" }, 500);

    // Insert sparks
    const rows = proposals.map((p) => ({
      name: p.name.slice(0, 200),
      content: p.content,
      generated_by_kind: "agent" as const,
      origin_event: `generate-component-sparks:${componentId}:${p.generation_tier}`,
      affected_components: [componentId],
      scope: "internal",
      template_id: p.template_id,
      generation_tier: p.generation_tier,
    }));

    const { data: inserted, error: insErr } = await admin
      .from("sparks")
      .insert(rows)
      .select("id, template_id");
    if (insErr) {
      console.error("Insert error:", insErr);
      return json({ error: insErr.message }, 500);
    }

    // Record template usages (for tier=template and tier=adapted)
    const usageRows = (inserted ?? [])
      .filter((s: any) => s.template_id)
      .map((s: any) => ({
        template_id: s.template_id,
        spark_id: s.id,
        component_id: componentId,
      }));
    if (usageRows.length) {
      await admin.from("spark_template_usages").insert(usageRows);
    }

    return json({ ok: true, count: rows.length, tier });
  } catch (e) {
    console.error("generate-component-sparks error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fillSlots(text: string, component: { name: string }): string {
  // Deterministic slot fills for the obvious ones
  return text
    .replaceAll("{component}", component.name)
    .replaceAll("{component_name}", component.name);
}

async function adaptTemplates(
  templates: any[],
  component: { id: string; name: string; description: string | null; current_maturity_level: string | null },
  apiKey: string,
): Promise<{ proposals: SparkProposal[]; error?: string; status?: number }> {
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You adapt curated Spark templates by filling in placeholder {slots} with concrete, component-specific language. Keep the template's structure and intent. Do not invent new actions outside the template.",
        },
        {
          role: "user",
          content: `Component: ${component.name}\nDescription: ${component.description ?? "(none)"}\nMaturity: ${component.current_maturity_level ?? "unknown"}\n\nAdapt these ${templates.length} template(s). For each, return the same template text with all {slots} replaced by concrete language for this component. Keep the title short and imperative.`,
        },
        { role: "user", content: JSON.stringify(templates.map((t) => ({ id: t.id, name: t.name, body: t.body_template }))) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_adapted",
          parameters: {
            type: "object",
            properties: {
              adapted: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    template_id: { type: "string" },
                    name: { type: "string" },
                    content: { type: "string" },
                  },
                  required: ["template_id", "name", "content"],
                },
              },
            },
            required: ["adapted"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_adapted" } },
    }),
  });
  if (!aiResponse.ok) return aiError(aiResponse);
  const j = await aiResponse.json();
  const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
  const proposals: SparkProposal[] = (args.adapted ?? []).map((a: any) => ({
    name: a.name,
    content: a.content,
    template_id: a.template_id,
    generation_tier: "adapted" as const,
  }));
  return { proposals };
}

async function generateFresh(
  component: { name: string; description: string | null; current_maturity_level: string | null },
  apiKey: string,
): Promise<{ proposals: SparkProposal[]; error?: string; status?: number }> {
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You generate small, atomic Sparks that advance a business Component's maturity. Each Spark is one self-contained action a person can complete between coaching sessions. Be concrete and outcome-oriented.",
        },
        {
          role: "user",
          content: `Component: ${component.name}\nCurrent maturity: ${component.current_maturity_level ?? "unknown"}\nDescription: ${component.description ?? "(none)"}\n\nPropose 3-5 Sparks to advance this component to the next maturity level.`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "propose_sparks",
          parameters: {
            type: "object",
            properties: {
              sparks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    content: { type: "string" },
                  },
                  required: ["name", "content"],
                },
              },
            },
            required: ["sparks"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "propose_sparks" } },
    }),
  });
  if (!aiResponse.ok) return aiError(aiResponse);
  const j = await aiResponse.json();
  const args = JSON.parse(j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
  const proposals: SparkProposal[] = (args.sparks ?? []).slice(0, 5).map((s: any) => ({
    name: s.name,
    content: s.content,
    template_id: null,
    generation_tier: "generated" as const,
  }));
  return { proposals };
}

async function aiError(r: Response): Promise<{ proposals: SparkProposal[]; error: string; status: number }> {
  if (r.status === 429) return { proposals: [], error: "Rate limit exceeded, try again shortly.", status: 429 };
  if (r.status === 402) return { proposals: [], error: "Lovable AI credits exhausted.", status: 402 };
  const t = await r.text();
  console.error("AI error:", r.status, t);
  return { proposals: [], error: "AI gateway error", status: 500 };
}
