// UX Auditor — scores a route's source against SweetBOS canon rules.
// Manual-fire only. Returns structured findings via tool calling.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PLACEHOLDER prompt — replace with the polished version produced by your
// other LLM using /mnt/documents/ux-auditor-briefing.md.
const SYSTEM_PROMPT = `You are the SweetBOS UI/UX Auditor.

Score the supplied route source file against SweetBOS canon and return a single
\`record_audit\` tool call. Be specific, ground every finding in a file:line,
and suggest the canonical fix from the rules below.

Canon rules to enforce:
- Stage-as-Board: every status enum field MUST render as a draggable board, not a plain Select. Use useDragToStatus + StageSwimlanes.
- Views-are-Truth: index/detail pages must read from rollup views (e.g. relationship_journey, project_rollup, measure_health), never re-derive in JS.
- Every actionable record exposes 5 time fields (created · not_before · scheduled_for · due · done) and MUST mount <TimeControls>.
- Polymorphic Measures attach via <MeasuresPanel subjectType subjectId> — never re-implement.
- 8 BizzyBot Lenses (F1–F8) are canon — never invent new lenses.
- Sparks are system-generated only. Tasks are human/agent/workflow. Provenance chips required.
- Domains and Tenets are independent axes — never co-rendered as one chip group. Use DomainTenetChips (two parallel selects).
- Sidebar IA is locked at 7 groups: Today · Deliver · Think · SweetSync · People · Library · Settings.
- Detail pages for canonical entities (quest, spark, component, mission, etc.) MUST mount <CanonGuardrail entityKind="...">.

Design language:
- Light-first SweetBot world, premium, luminous, dimensional, rounded precision, calm guided intelligence.
- Semantic tokens only (var(--iris-violet), bg-surface, text-muted-foreground). Never raw hex or named Tailwind colors like text-white / bg-black.

Score rubric (1–5, 5 = best):
- hierarchy: visual rhythm, clear primary action, headings ordered
- density: breathable but information-rich, no wasted space
- states: empty / loading / error states explicitly handled
- a11y: keyboard, aria, focus, color-contrast hints
- canon: how well the page mounts the required canonical components

Anti-patterns to flag (severity high):
- \`as any\` casts, raw hex colors, missing empty/loading/error states
- status field rendered as plain Select instead of board
- actionable detail page missing <TimeControls>
- Domain + Tenet chips in one group
- canonical entity detail page missing <CanonGuardrail>

Do NOT flag:
- Generic SaaS recommendations ("add analytics", "consider a tour")
- Aesthetic taste preferences not grounded in canon
- Issues outside the supplied source file`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "record_audit",
    description: "Record a structured UI/UX audit of the supplied route source.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        scores: {
          type: "object",
          additionalProperties: false,
          properties: {
            hierarchy: { type: "integer", minimum: 1, maximum: 5 },
            density: { type: "integer", minimum: 1, maximum: 5 },
            states: { type: "integer", minimum: 1, maximum: 5 },
            a11y: { type: "integer", minimum: 1, maximum: 5 },
            canon: { type: "integer", minimum: 1, maximum: 5 },
          },
          required: ["hierarchy", "density", "states", "a11y", "canon"],
        },
        findings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              severity: { type: "string", enum: ["low", "medium", "high"] },
              rule: { type: "string", description: "Canon rule key (e.g. stage-as-board, views-as-truth)" },
              message: { type: "string" },
              file: { type: "string" },
              line: { type: "integer" },
              fix_hint: { type: "string" },
            },
            required: ["severity", "rule", "message", "file", "line", "fix_hint"],
          },
        },
        guardrails_missing: {
          type: "array",
          items: { type: "string" },
          description: "Names of canonical components that should be mounted but aren't (e.g. CanonGuardrail, TimeControls, MeasuresPanel)",
        },
        summary: { type: "string", description: "One-paragraph plain-English overview" },
      },
      required: ["scores", "findings", "guardrails_missing", "summary"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { routePath, sourcePath, sourceCode, knownIssues = [] } = await req.json();
    if (!routePath || !sourceCode) {
      return json({ error: "routePath and sourceCode are required" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const userMessage = [
      `Route: ${routePath}`,
      `Source path: ${sourcePath ?? "(unknown)"}`,
      knownIssues.length ? `Known UX issues already reported by the user (treat as signal, not discoveries):\n- ${knownIssues.join("\n- ")}` : "",
      "",
      "Source:",
      "```tsx",
      sourceCode.slice(0, 60_000), // safety cap
      "```",
    ]
      .filter(Boolean)
      .join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "record_audit" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Rate limited — try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "Lovable AI credits exhausted. Top up in Settings → Workspace → Usage." }, 402);
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return json({ error: "Auditor did not return a structured result" }, 502);
    }

    let parsed;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("tool args parse failed", e, toolCall.function.arguments);
      return json({ error: "Auditor returned malformed JSON" }, 502);
    }

    const { data: inserted, error: insErr } = await admin
      .from("ux_audit_runs")
      .insert({
        route_path: routePath,
        source_path: sourcePath ?? null,
        audited_by: userId,
        model: "google/gemini-3-flash-preview",
        scores: parsed.scores ?? {},
        findings: parsed.findings ?? [],
        guardrails_missing: parsed.guardrails_missing ?? [],
        ux_issues_user_reported: knownIssues,
        notes: parsed.summary ?? null,
        status: "open",
      })
      .select("*")
      .single();

    if (insErr) {
      console.error("insert error", insErr);
      return json({ error: insErr.message }, 500);
    }

    return json({ run: inserted });
  } catch (e) {
    console.error("ux-audit error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
