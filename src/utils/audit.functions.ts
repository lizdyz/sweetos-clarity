// Server functions used by the Audit Console UI.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FiltersSchema = z.object({
  date_range: z.enum(["24h", "7d", "30d", "90d", "all"]).optional(),
  date_from: z.string().nullable().optional(),
  date_to: z.string().nullable().optional(),
  categories: z.array(z.string()).optional(),
  severities: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  subject_kinds: z.array(z.string()).optional(),
  subject_id: z.string().uuid().nullable().optional(),
  actor_id: z.string().uuid().nullable().optional(),
  source_run_kind: z.string().nullable().optional(),
  source_run_id: z.string().uuid().nullable().optional(),
  field: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
  tags_any: z.array(z.string()).optional(),
  request_id: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

function dateFromRange(range?: string | null): string | null {
  if (!range || range === "all") return null;
  const now = Date.now();
  const map: Record<string, number> = {
    "24h": 24 * 3600 * 1000,
    "7d": 7 * 86400 * 1000,
    "30d": 30 * 86400 * 1000,
    "90d": 90 * 86400 * 1000,
  };
  const ms = map[range];
  if (!ms) return null;
  return new Date(now - ms).toISOString();
}

export const listAuditEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FiltersSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("audit_events_enriched")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    const since = data.date_from ?? dateFromRange(data.date_range ?? "7d");
    if (since) q = q.gte("created_at", since);
    if (data.date_to) q = q.lte("created_at", data.date_to);
    if (data.categories?.length) q = q.in("event_category", data.categories);
    if (data.severities?.length) q = q.in("severity", data.severities);
    if (data.sources?.length) q = q.in("source", data.sources);
    if (data.subject_kinds?.length) q = q.in("subject_kind", data.subject_kinds);
    if (data.subject_id) q = q.eq("subject_id", data.subject_id);
    if (data.actor_id) q = q.eq("created_by", data.actor_id);
    if (data.source_run_kind) q = q.eq("source_run_kind", data.source_run_kind);
    if (data.source_run_id) q = q.eq("source_run_id", data.source_run_id);
    if (data.field) q = q.eq("field", data.field);
    if (data.tags_any?.length) q = q.overlaps("tags", data.tags_any);
    if (data.request_id) q = q.eq("request_id", data.request_id);
    if (data.search) {
      q = q.or(
        `notes.ilike.%${data.search}%,subject_label.ilike.%${data.search}%,field.ilike.%${data.search}%`,
      );
    }

    const limit = data.limit ?? 60;
    const offset = data.offset ?? 0;
    q = q.range(offset, offset + limit - 1);

    const { data: rows, error, count } = await q;
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[audit.list] failed", error);
      return { rows: [] as unknown[], total: 0, error: error.message as string | null };
    }
    return {
      rows: (rows ?? []) as unknown[],
      total: count ?? 0,
      error: null as string | null,
    };
  });

export const listAuditSavedViews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("audit_saved_views")
      .select("*")
      .order("is_workspace_pinned", { ascending: false })
      .order("name", { ascending: true });
    if (error) return { views: [], error: error.message };
    return { views: data ?? [], error: null };
  });

export const saveAuditView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional().nullable(),
        filters: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("audit_saved_views")
      .insert({
        name: data.name,
        description: data.description ?? null,
        filters: data.filters as never,
        created_by: userId,
      })
      .select()
      .single();
    if (error) return { view: null, error: error.message };
    return { view: row, error: null };
  });

export const deleteAuditView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("audit_saved_views").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

export const listAuditActors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name", { ascending: true })
      .limit(200);
    if (error) return { actors: [], error: error.message };
    return { actors: data ?? [], error: null };
  });
