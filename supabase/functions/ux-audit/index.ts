// UX Auditor — scores a route's source against SweetBOS canon rules.
// Manual-fire only. Returns structured findings via tool calling.
//
// Two-layer audit:
//  1. Deterministic PRESENCE CHECK (regex on source) — produces auto-HIGH findings
//     for missing canonical components based on route classification.
//  2. AI judgment pass — nuanced findings on hierarchy, density, states, a11y.
// The canon score is hard-capped by the count of presence-check violations so the
// AI can't paper over missing components with eloquent prose.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// PRESENCE-CHECK LAYER
// ---------------------------------------------------------------------------

type RouteKind =
  | "entity_detail"
  | "actionable_detail"
  | "measure_subject"
  | "index"
  | "settings"
  | "operate"
  | "library"
  | "other";

// Literal lookup table — adding a new route requires adding a row (intentional friction).
// Keys are route paths as registered in the audit cockpit.
const ROUTE_CLASSIFIER: Record<string, RouteKind> = {
  // Actionable detail pages (require CanonGuardrail + TimeControls + status board)
  "/quests/$id": "actionable_detail",
  "/missions/$id": "actionable_detail",
  "/projects/$id": "actionable_detail",
  "/tasks/$id": "actionable_detail",
  "/sessions/$id": "actionable_detail",
  "/workflows/$id": "actionable_detail",
  "/outcomes/$id": "actionable_detail",
  "/campaigns/$id": "actionable_detail",
  "/engagement-plans/$id": "actionable_detail",

  // Entity detail pages (require CanonGuardrail; may also be measure subjects)
  "/sparks/$id": "entity_detail",
  "/components/$id": "measure_subject",
  "/relationships/$id": "measure_subject",
  "/personas/$id": "entity_detail",
  "/playbooks/$id": "entity_detail",
  "/session-templates/$id": "entity_detail",
  "/decisions/$id": "entity_detail",
  "/operators/$id": "entity_detail",
  "/journeys/$id": "entity_detail",
  "/domain-assessments/$id": "entity_detail",
  "/domains/$slug": "measure_subject",
  "/tenets/$slug": "measure_subject",

  // Index pages (require status-as-board where status exists, view-backed rollups)
  "/quests": "index",
  "/missions": "index",
  "/projects": "index",
  "/tasks": "index",
  "/sessions": "index",
  "/workflows": "index",
  "/outcomes": "index",
  "/relationships": "index",
  "/sparks": "index",
  "/components": "index",
  "/decisions": "index",
  "/delegation": "index",
  "/documents": "index",
  "/personas": "index",
  "/playbooks": "index",
  "/operators": "index",
  "/engagement-plans": "index",
  "/domain-assessments": "index",
  "/session-templates": "index",
  "/campaigns": "index",
  "/people": "index",

  // Operate / mission-control surfaces
  "/today": "operate",
  "/calendar": "operate",
  "/capture": "operate",
  "/operate/ocda": "operate",
  "/sweetcycle": "operate",
  "/flightdeck": "operate",
  "/sweetsync": "operate",
  "/measures": "operate",
  "/planner": "operate",
  "/pipeline": "operate",
  "/queue": "operate",
  "/my-tasks": "operate",
  "/bizzybots": "operate",

  // Library
  "/library/jtbd": "library",
  "/vault": "library",

  // Settings — opted out of most presence rules
  "/settings": "settings",
};

interface PresenceRule {
  key: string; // machine-readable rule id
  rule_name: string; // human label
  detect: (src: string) => boolean; // returns TRUE if violation present
  appliesTo: ReadonlyArray<RouteKind>;
  fix_hint: string;
  canon_ref: string;
}

// detect() returns TRUE if the rule is VIOLATED (component missing or wrong pattern).
const PRESENCE_RULES: ReadonlyArray<PresenceRule> = [
  {
    key: "CANON_REQUIRES_CANON_GUARDRAIL",
    rule_name: "Canon Guardrail must be mounted on entity / actionable detail pages",
    appliesTo: ["entity_detail", "actionable_detail", "measure_subject"],
    detect: (src) => !/<CanonGuardrail\s+entityKind=/.test(src),
    fix_hint:
      'Add `<CanonGuardrail entityKind="<kind>" />` near the top of the page body, above the tabs.',
    canon_ref: "mem://design/entity-canon",
  },
  {
    key: "CANON_REQUIRES_TIME_CONTROLS",
    rule_name: "TimeControls must be mounted on every actionable detail page",
    appliesTo: ["actionable_detail"],
    detect: (src) => !/<TimeControls\s/.test(src),
    fix_hint:
      'Add `<TimeControls table="<table>" rowId={id} />` so the 5 time fields (created · not_before · scheduled_for · due · done) are editable.',
    canon_ref: "mem://features/work-graph-time",
  },
  {
    key: "CANON_REQUIRES_MEASURES_PANEL",
    rule_name: "MeasuresPanel must be present on measure-subject pages",
    appliesTo: ["measure_subject"],
    detect: (src) => !/<MeasuresPanel\s/.test(src),
    fix_hint:
      'Add `<MeasuresPanel subjectType="<type>" subjectId={id} />` — never re-implement Objective/KR/KPI/CSF UI.',
    canon_ref: "mem://features/measures",
  },
  {
    key: "CANON_FORBIDS_MERGED_DOMAIN_TENET",
    rule_name: "Domains and Tenets must render as two parallel selects, never merged",
    appliesTo: ["entity_detail", "actionable_detail", "measure_subject", "index"],
    detect: (src) => {
      // Violation: a single tag/chip prop concatenates domains + tenets, OR
      // a TagPicker references both arrays merged into one input.
      const merged =
        /tags=\{\[\s*\.\.\.[^}]*tagged_domains[^}]*\.\.\.[^}]*tagged_tenets/.test(src) ||
        /\[\s*\.\.\.tagged_domains\s*,\s*\.\.\.tagged_tenets/.test(src);
      return merged;
    },
    fix_hint:
      "Render domains and tenets in two separate <DomainTenetChips /> selects (or two TagPickers). They are independent axes.",
    canon_ref: "mem://design/canon-vocabulary",
  },
  {
    key: "CANON_REQUIRES_STAGE_AS_BOARD",
    rule_name: "Status fields must render as <StageSwimlanes>, not a plain Select",
    appliesTo: ["index", "actionable_detail"],
    detect: (src) => {
      const hasStatusSelect =
        /<Select[^>]*>[\s\S]{0,400}?status/i.test(src) ||
        /onChange=\{[^}]*status\s*:\s*e\.target\.value/.test(src);
      const hasStageBoard = /<StageSwimlanes\b/.test(src) || /useDragToStatus\b/.test(src) || /<KanbanBoard\b/.test(src);
      // Violation: a status mutation surface exists but no board component anywhere.
      return hasStatusSelect && !hasStageBoard;
    },
    fix_hint:
      "Replace the status <Select> with <StageSwimlanes /> + useDragToStatus. Status is always a board.",
    canon_ref: "mem://design/stage-as-board",
  },
  {
    key: "CANON_FORBIDS_HUMAN_SPARK_CREATION",
    rule_name: "Sparks are system-generated only — no human creation UI allowed",
    appliesTo: ["entity_detail", "actionable_detail", "measure_subject", "index", "operate", "library"],
    detect: (src) => {
      const clientInsert = /\.from\(['"]sparks['"]\)\s*\.insert\b/.test(src);
      const newSparkButton = /(?:New|Create|Add)\s+Spark/i.test(src) && !/system-generated/i.test(src);
      return clientInsert || newSparkButton;
    },
    fix_hint:
      "Remove client-side spark insert / 'New Spark' button. Sparks are spawned by Quest curators or system runs only.",
    canon_ref: "mem://design/canon-sparks-vs-tasks",
  },
  {
    key: "CANON_REQUIRES_VIEW_BACKED_ROLLUPS",
    rule_name: "Rollups must read from canonical views, never re-derived in JS",
    appliesTo: ["index", "operate"],
    detect: (src) => {
      // Heuristic: heavy client-side aggregation patterns on raw tables when a view exists.
      const aggregatesInJs =
        /\.reduce\(\s*\([^)]*\)\s*=>[\s\S]{0,200}?\+/.test(src) ||
        /\.filter\([^)]*\)\.length\s*[/+]/.test(src);
      const queriesRawTables =
        /\.from\(['"](relationships|projects|tasks|measures|measure_readings|excellence_scores|operators)['"]\)/.test(src);
      const usesView =
        /\.from\(['"](relationship_journey|relationship_domain_maturity|project_rollup|measure_health|operator_workload|component_build_pipeline|time_grid|engagement_service_rollup|maturity_threshold_progress)['"]\)/.test(src);
      return aggregatesInJs && queriesRawTables && !usesView;
    },
    fix_hint:
      "Read from a canonical view (relationship_journey · project_rollup · measure_health · operator_workload · component_build_pipeline · time_grid). Don't .reduce() raw rows.",
    canon_ref: "mem://design/views-as-truth",
  },
];

interface PresenceFinding {
  severity: "high";
  axis: "canon";
  rule: string;
  rule_name: string;
  message: string;
  description: string;
  file: string;
  line: number;
  fix_hint: string;
  detected_by: "presence_check";
  canon_ref: string;
}

function classifyRoute(routePath: string): RouteKind {
  return ROUTE_CLASSIFIER[routePath] ?? "other";
}

function runPresenceChecks(
  routePath: string,
  sourcePath: string | null,
  source: string,
): { findings: PresenceFinding[]; kind: RouteKind } {
  const kind = classifyRoute(routePath);
  if (kind === "other" || kind === "settings") return { findings: [], kind };

  const findings: PresenceFinding[] = [];
  for (const rule of PRESENCE_RULES) {
    if (!rule.appliesTo.includes(kind)) continue;
    if (rule.detect(source)) {
      findings.push({
        severity: "high",
        axis: "canon",
        rule: rule.key,
        rule_name: rule.rule_name,
        message: `${sourcePath ?? routePath} (classified ${kind}) violates: ${rule.rule_name}.`,
        description: `${sourcePath ?? routePath} is classified as ${kind} but failed presence check ${rule.key}.`,
        file: sourcePath ?? routePath,
        line: 1,
        fix_hint: rule.fix_hint,
        detected_by: "presence_check",
        canon_ref: rule.canon_ref,
      });
    }
  }
  return { findings, kind };
}

function capCanonScore(rawScore: number, violations: number): number {
  if (violations <= 0) return rawScore;
  if (violations === 1) return Math.min(rawScore, 3);
  if (violations === 2) return Math.min(rawScore, 2);
  return 1;
}

// ---------------------------------------------------------------------------
// AI LAYER
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the SweetBOS UI/UX Auditor.

Score the supplied route source file against SweetBOS canon and return a single
\`record_audit\` tool call. Be specific, ground every finding in a file:line,
and suggest the canonical fix from the rules below.

A deterministic presence-check layer runs BEFORE you and already records
HIGH-severity findings for missing canonical components (CanonGuardrail,
TimeControls, MeasuresPanel, StageSwimlanes, DomainTenetChips, Spark-creation
locks, view-backed rollups). Do NOT duplicate those — focus on hierarchy,
density, states, a11y, and any nuance the regex layer can't see.

Canon rules (for context only — presence layer enforces them mechanically):
- Stage-as-Board · Views-are-Truth · TimeControls · MeasuresPanel · 8 BizzyBot Lenses
- Sparks system-generated only · Domains⊥Tenets · 7-group sidebar · CanonGuardrail on entity detail

Design language:
- Light-first SweetBot world, premium, luminous, dimensional, rounded precision, calm guided intelligence.
- Semantic tokens only (var(--iris-violet), bg-surface, text-muted-foreground). Never raw hex or text-white / bg-black.

Score rubric (1–5, 5 = best):
- hierarchy: visual rhythm, clear primary action, headings ordered
- density: breathable but information-rich, no wasted space
- states: empty / loading / error states explicitly handled
- a11y: keyboard, aria, focus, color-contrast hints
- canon: how well the page mounts the required canonical components (the presence layer will cap this score)

Anti-patterns to flag (severity high):
- \`as any\` casts, raw hex colors, missing empty/loading/error states
- aesthetic incoherence with the design language

Tone (MANDATORY):
- One sentence per finding. No hedging — never use "consider", "might", "could", "maybe", "perhaps".
- Every \`message\` must state: the violation + the line + the fix. Imperative voice.
- Example: "Line 47: status field uses plain <Select>; replace with <StageSwimlanes>."

Do NOT flag:
- Generic SaaS recommendations ("add analytics", "consider a tour")
- Aesthetic taste preferences not grounded in canon
- Issues outside the supplied source file
- Anything the presence layer already records
- Roadmap items not yet built: realtime collaboration, mobile/native apps, third-party integrations, peer community features — these are product decisions, not audit failures`;

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

    // 1. Deterministic presence check (runs first, can't be softened by AI)
    const { findings: presenceFindings, kind: routeKind } = runPresenceChecks(
      routePath,
      sourcePath ?? null,
      sourceCode,
    );

    const userMessage = [
      `Route: ${routePath}`,
      `Source path: ${sourcePath ?? "(unknown)"}`,
      `Route classification: ${routeKind}`,
      presenceFindings.length
        ? `Presence-check violations already recorded (do NOT duplicate):\n- ${presenceFindings.map((f) => f.rule).join("\n- ")}`
        : "Presence-check passed — no missing canonical components detected.",
      knownIssues.length ? `Known UX issues already reported by the user (treat as signal, not discoveries):\n- ${knownIssues.join("\n- ")}` : "",
      "",
      "Source:",
      "```tsx",
      sourceCode.slice(0, 60_000),
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

    // Apply hard cap to canon score based on presence violations
    const aiScores = parsed.scores ?? {};
    const cappedCanon = capCanonScore(
      typeof aiScores.canon === "number" ? aiScores.canon : 5,
      presenceFindings.length,
    );
    const finalScores = { ...aiScores, canon: cappedCanon };

    // Merge presence findings (first, so they render at the top) + AI findings
    const mergedFindings = [...presenceFindings, ...(parsed.findings ?? [])];

    // Add the canonical components flagged by presence layer to guardrails_missing
    const presenceMissing = presenceFindings
      .map((f) => {
        if (f.rule === "CANON_REQUIRES_CANON_GUARDRAIL") return "CanonGuardrail";
        if (f.rule === "CANON_REQUIRES_TIME_CONTROLS") return "TimeControls";
        if (f.rule === "CANON_REQUIRES_MEASURES_PANEL") return "MeasuresPanel";
        if (f.rule === "CANON_REQUIRES_STAGE_AS_BOARD") return "StageSwimlanes";
        return null;
      })
      .filter((v): v is string => Boolean(v));
    const mergedGuardrails = Array.from(
      new Set([...presenceMissing, ...(parsed.guardrails_missing ?? [])]),
    );

    const { data: inserted, error: insErr } = await admin
      .from("ux_audit_runs")
      .insert({
        route_path: routePath,
        source_path: sourcePath ?? null,
        audited_by: userId,
        model: "google/gemini-3-flash-preview",
        scores: finalScores,
        findings: mergedFindings,
        guardrails_missing: mergedGuardrails,
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

    return json({
      run: inserted,
      presence: { kind: routeKind, violations: presenceFindings.length },
    });
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
