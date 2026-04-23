import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Gap-Closer scan. Walks active entities every 6h (cron), checks coverage
 * against entity_canon.coverage_rules, and drops a system-attributed Spark
 * for each gap.
 *
 * No-op if org_settings.gap_closer.enabled is false.
 */
export const Route = createFileRoute("/api/public/hooks/gap-scan")({
  server: {
    handlers: {
      POST: async () => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!serviceKey) {
          return json({ error: "missing service key" }, 500);
        }
        const sb = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Toggle gate.
        const { data: setting } = await sb
          .from("org_settings")
          .select("value")
          .eq("key", "gap_closer")
          .maybeSingle();
        const enabled = !!(setting?.value as { enabled?: boolean } | null)?.enabled;
        if (!enabled) {
          return json({ skipped: true, reason: "gap_closer disabled" });
        }

        // Open a run.
        const { data: run } = await sb
          .from("gap_scan_runs")
          .insert({ status: "running" })
          .select("id")
          .single();
        const runId = run?.id as string;

        let scanned = 0;
        let gaps = 0;
        let sparksCreated = 0;

        try {
          // Pull canon coverage rules per kind we know how to scan.
          const { data: canons } = await sb
            .from("entity_canon")
            .select("entity_kind, display_name, coverage_rules")
            .in("entity_kind", ["relationship", "persona", "quest", "kti"]);
          const ruleByKind = new Map<string, CoverageRules>();
          for (const c of (canons ?? []) as Array<{ entity_kind: string; coverage_rules: CoverageRules }>) {
            ruleByKind.set(c.entity_kind, c.coverage_rules);
          }

          // 1) Relationships: stale capture
          const relRule = ruleByKind.get("relationship");
          if (relRule) {
            const { data: rels } = await sb
              .from("relationships")
              .select("id, name, last_contact, status")
              .eq("status", "active")
              .limit(200);
            for (const r of (rels ?? []) as Array<{ id: string; name: string; last_contact: string | null }>) {
              scanned++;
              const stale = isStale(r.last_contact, relRule.stale_capture_days ?? 21);
              if (stale) {
                gaps++;
                const ok = await proposeSpark(sb, {
                  subjectKind: "relationship",
                  subjectId: r.id,
                  subjectLabel: r.name,
                  reason: `No contact in ${relRule.stale_capture_days ?? 21}+ days`,
                  question: `What changed at ${r.name} since last touch? Any new wedge, decision, or signal worth a capture?`,
                  runId,
                });
                if (ok) sparksCreated++;
              }
            }
          }

          // 2) Personas: missing JTBD link
          const personaRule = ruleByKind.get("persona");
          if (personaRule?.require_jtbd_link) {
            const { data: personas } = await sb
              .from("personas")
              .select("id, name")
              .limit(200);
            for (const p of (personas ?? []) as Array<{ id: string; name: string }>) {
              scanned++;
              const { count } = await sb
                .from("persona_jtbds")
                .select("persona_id", { count: "exact", head: true })
                .eq("persona_id", p.id);
              if ((count ?? 0) === 0) {
                gaps++;
                const ok = await proposeSpark(sb, {
                  subjectKind: "persona",
                  subjectId: p.id,
                  subjectLabel: p.name,
                  reason: "No JTBDs linked",
                  question: `Persona "${p.name}" has zero JTBDs. What job are they hiring you for?`,
                  runId,
                });
                if (ok) sparksCreated++;
              }
            }
          }

          // 3) KTIs: no readings in window
          const ktiRule = ruleByKind.get("kti");
          if (ktiRule) {
            const { data: ktis } = await sb
              .from("key_trend_indicators")
              .select("id, name, status")
              .eq("status", "active")
              .limit(200);
            for (const k of (ktis ?? []) as Array<{ id: string; name: string }>) {
              scanned++;
              const { count } = await sb
                .from("kti_scans")
                .select("id", { count: "exact", head: true })
                .eq("kti_id", k.id)
                .gte("scanned_at", new Date(Date.now() - 14 * 86_400_000).toISOString());
              if ((count ?? 0) === 0) {
                gaps++;
                const ok = await proposeSpark(sb, {
                  subjectKind: "kti",
                  subjectId: k.id,
                  subjectLabel: k.name,
                  reason: "No readings in 14 days",
                  question: `KTI "${k.name}" hasn't had a reading in 14+ days. Any inbound signal that should count?`,
                  runId,
                });
                if (ok) sparksCreated++;
              }
            }
          }

          // 4) Quests: no spark in window
          const questRule = ruleByKind.get("quest");
          if (questRule) {
            const { data: quests } = await sb
              .from("quests")
              .select("id, name, progression_state")
              .neq("progression_state", "complete")
              .limit(200);
            for (const q of (quests ?? []) as Array<{ id: string; name: string }>) {
              scanned++;
              const { count } = await sb
                .from("sparks")
                .select("id", { count: "exact", head: true })
                .eq("quest_id", q.id)
                .gte("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString());
              if ((count ?? 0) === 0) {
                gaps++;
                const ok = await proposeSpark(sb, {
                  subjectKind: "quest",
                  subjectId: q.id,
                  subjectLabel: q.name,
                  reason: "No sparks in 90 days",
                  question: `Quest "${q.name}" has no recent Sparks. What's the next angle worth exploring?`,
                  runId,
                });
                if (ok) sparksCreated++;
              }
            }
          }

          await sb
            .from("gap_scan_runs")
            .update({
              finished_at: new Date().toISOString(),
              status: "ok",
              entities_scanned: scanned,
              gaps_found: gaps,
              sparks_created: sparksCreated,
            })
            .eq("id", runId);

          return json({ ok: true, scanned, gaps, sparks_created: sparksCreated });
        } catch (e) {
          await sb
            .from("gap_scan_runs")
            .update({
              finished_at: new Date().toISOString(),
              status: "error",
              error: e instanceof Error ? e.message : String(e),
              entities_scanned: scanned,
              gaps_found: gaps,
              sparks_created: sparksCreated,
            })
            .eq("id", runId);
          return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
        }
      },
    },
  },
});

interface CoverageRules {
  stale_capture_days?: number;
  require_jtbd_link?: boolean;
  require_active_kti?: boolean;
  min_sparks_per_quarter?: number;
}

function isStale(iso: string | null, days: number): boolean {
  if (!iso) return true;
  const ageDays = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return ageDays >= days;
}

interface ProposeArgs {
  subjectKind: string;
  subjectId: string;
  subjectLabel: string;
  reason: string;
  question: string;
  runId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function proposeSpark(sb: any, args: ProposeArgs): Promise<boolean> {
  // Dedupe: skip if an agent-spark for the same subject was created in last 7d.
  const originTag = `gap_scanner:${args.subjectKind}:${args.subjectId}`;
  const { count } = await sb
    .from("sparks")
    .select("id", { count: "exact", head: true })
    .eq("origin_event", originTag)
    .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
  if ((count ?? 0) > 0) return false;

  // Fan subject onto the row's existing FK columns where possible.
  const payload: Record<string, unknown> = {
    name: `${args.subjectLabel}: ${args.reason}`,
    content: args.question,
    generated_by_kind: "agent",
    progression_state: "captured",
    origin_event: originTag,
  };
  if (args.subjectKind === "relationship") payload.relationship_id = args.subjectId;
  if (args.subjectKind === "quest") payload.quest_id = args.subjectId;

  const { error } = await sb.from("sparks").insert(payload);
  return !error;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
