import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Cron entry point. Scans all due KTIs based on their scan_frequency.
 * Configure with pg_cron + pg_net to POST to this URL daily.
 * The handler will pick up daily/weekly/monthly KTIs based on last scan time.
 */
export const Route = createFileRoute("/api/public/hooks/scan-ktis")({
  server: {
    handlers: {
      POST: async () => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!serviceKey) {
          return new Response(JSON.stringify({ error: "missing service key" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const sb = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Fetch active KTIs and their latest scan time
        const { data: ktis, error } = await sb
          .from("key_trend_indicators")
          .select("id, scan_frequency")
          .eq("status", "active");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const now = Date.now();
        const dueIds: string[] = [];
        for (const k of (ktis ?? []) as Array<{ id: string; scan_frequency: string }>) {
          const { data: latest } = await sb
            .from("kti_scans")
            .select("scanned_at")
            .eq("kti_id", k.id)
            .order("scanned_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const lastMs = latest?.scanned_at
            ? new Date(latest.scanned_at as string).getTime()
            : 0;
          const ageDays = (now - lastMs) / 86_400_000;
          const interval =
            k.scan_frequency === "daily" ? 1 : k.scan_frequency === "weekly" ? 7 : 30;
          if (ageDays >= interval) dueIds.push(k.id);
        }

        // Fan out scan invocations
        const results: Array<{ kti_id: string; ok: boolean; error?: string }> = [];
        for (const id of dueIds) {
          try {
            const { error: invErr } = await sb.functions.invoke("scan-signals", {
              body: { mode: "kti", kti_id: id },
            });
            results.push({ kti_id: id, ok: !invErr, error: invErr?.message });
          } catch (e) {
            results.push({
              kti_id: id,
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        return new Response(
          JSON.stringify({ scanned: results.length, results }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
