// Generate maturity-advancing Spark proposals for a Component using Lovable AI.
// Service-role insert bypasses the human-spark-creation trigger.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { componentId } = await req.json();
    if (!componentId) {
      return new Response(JSON.stringify({ error: "componentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    if (cErr || !component) {
      return new Response(JSON.stringify({ error: "Component not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI with structured tool-call output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
            content: `Component: ${component.name}\nCurrent maturity: ${component.current_maturity_level ?? "unknown"}\nDescription: ${component.description ?? "(none)"}\n\nPropose 3-5 Sparks that would advance this component to the next maturity level.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "propose_sparks",
              description: "Return 3-5 Spark proposals for advancing the component.",
              parameters: {
                type: "object",
                properties: {
                  sparks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Short imperative title (max 80 chars)" },
                        content: { type: "string", description: "1-2 sentence description of what to do and why" },
                      },
                      required: ["name", "content"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["sparks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "propose_sparks" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Lovable AI credits exhausted. Add funds at Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResponse.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No tool call in AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments) as {
      sparks: Array<{ name: string; content: string }>;
    };

    // Insert as system-generated sparks (service role bypasses trigger)
    const rows = args.sparks.slice(0, 5).map((s) => ({
      name: s.name.slice(0, 200),
      content: s.content,
      generated_by_kind: "agent" as const,
      origin_event: `generate-component-sparks:${componentId}`,
      affected_components: [componentId],
      scope: "internal",
    }));

    const { error: insErr } = await admin.from("sparks").insert(rows);
    if (insErr) {
      console.error("Insert error:", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-component-sparks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
