import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb } from "@/lib/sb";
import { Radar, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FireRow {
  id: string;
  kti_id: string;
  scanned_at: string;
  observed_value: string | null;
  notes: string | null;
  kti: { id: string; name: string; relationship_id: string | null } | null;
}

/**
 * Compact strip of KTI fires from the last 24h across all clients.
 * Daily morning glance — sits at the top of /today.
 * See `mem://design/sweetscan-as-eyes-and-ears.md`.
 */
export function FiredKtisStrip() {
  const { data: fires = [], isLoading } = useQuery<FireRow[]>({
    queryKey: ["fired-ktis-24h"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await sb
        .from("kti_scans")
        .select("id, kti_id, scanned_at, observed_value, notes, kti:key_trend_indicators(id, name, relationship_id)")
        .eq("fired", true)
        .gte("scanned_at", since)
        .order("scanned_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as FireRow[];
    },
  });

  if (isLoading || fires.length === 0) return null;

  return (
    <section className="panel-raised mb-4 overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em]">
            Fired KTIs · last 24h
          </h2>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            {fires.length}
          </span>
        </div>
        <Link
          to="/sweetscan"
          className="inline-flex items-center gap-1 text-[11px] text-[color:var(--iris-violet)] hover:underline"
        >
          <Radar className="h-3 w-3" /> Open SweetScan
        </Link>
      </header>
      <ul className="divide-y divide-border">
        {fires.map((f) => (
          <li key={f.id}>
            <Link
              to="/library/ktis/$id"
              params={{ id: f.kti_id }}
              className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-iris-soft/40"
            >
              <Flame className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="truncate font-medium">{f.kti?.name ?? "KTI"}</span>
              {f.observed_value && (
                <span className="truncate text-muted-foreground">· {f.observed_value}</span>
              )}
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(f.scanned_at), { addSuffix: true })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
