// Edge-function-side prompt loader. Mirrors src/utils/prompts.server.ts so every
// AI call reads from the Prompt Console at /settings/prompts. Falls back to the
// inline prompt if no DB row exists.
//
// Usage:
//   const p = await getPrompt(supabase, "brand.distill", {
//     systemPrompt: INLINE_SYSTEM,
//     userTemplate: INLINE_USER,
//     model: "google/gemini-2.5-flash",
//   });
//   // p.systemPrompt, p.userTemplate, p.model
//
// Tiny in-memory cache (per cold start) so repeated calls don't hammer the DB.

// deno-lint-ignore no-explicit-any
type SbClient = any;

export interface ResolvedPrompt {
  key: string;
  systemPrompt: string;
  userTemplate: string;
  model: string;
  source: "db" | "fallback";
}

export interface PromptFallback {
  systemPrompt: string;
  userTemplate?: string;
  model?: string;
}

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; value: ResolvedPrompt }>();

export async function getPrompt(
  sb: SbClient,
  key: string,
  fallback: PromptFallback,
): Promise<ResolvedPrompt> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  let value: ResolvedPrompt = {
    key,
    systemPrompt: fallback.systemPrompt,
    userTemplate: fallback.userTemplate ?? "{{text}}",
    model: fallback.model ?? "google/gemini-2.5-flash",
    source: "fallback",
  };

  try {
    const { data } = await sb
      .from("system_prompts")
      .select("system_prompt, user_prompt_template, model")
      .eq("key", key)
      .maybeSingle();
    if (data) {
      value = {
        key,
        systemPrompt: (data.system_prompt as string) || fallback.systemPrompt,
        userTemplate:
          (data.user_prompt_template as string) || fallback.userTemplate || "{{text}}",
        model: (data.model as string) || fallback.model || "google/gemini-2.5-flash",
        source: "db",
      };
    }
  } catch (e) {
    console.warn(`getPrompt(${key}) — falling back:`, e);
  }

  cache.set(key, { at: Date.now(), value });
  return value;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}
