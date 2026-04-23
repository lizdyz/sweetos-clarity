// Server-only prompt loader. Reads system_prompts by key with hardcoded fallbacks
// so the Prompt Console at /settings/prompts becomes the single source of truth
// for every AI call in the capture pipeline.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let _admin: ReturnType<typeof createClient<Database>> | null = null;
function admin() {
  if (!_admin) {
    _admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

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

// In-memory cache (per server instance) — small TTL so edits in /settings/prompts
// take effect within seconds without hammering the DB on every capture.
const TTL_MS = 30_000;
const cache = new Map<string, { at: number; value: ResolvedPrompt }>();

export async function getPrompt(key: string, fallback: PromptFallback): Promise<ResolvedPrompt> {
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
    const { data } = await admin()
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
