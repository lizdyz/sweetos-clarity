import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DelegationRow {
  id: string;
  category: string | null;
  currently_done_by: string | null;
  can_be_delegated_to: string | null;
  status: string | null;
}

/**
 * LizDependencyGauge — visualizes how much work is currently bottlenecked on Liz.
 * Computes from existing `delegation` rows. No schema changes.
 */
export function LizDependencyGauge() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["delegation", "all-for-gauge"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delegation")
        .select("id, category, currently_done_by, can_be_delegated_to, status");
      if (error) throw error;
      return (data ?? []) as DelegationRow[];
    },
  });

  if (isLoading || rows.length === 0) return null;

  const isLizOnly = (r: DelegationRow) =>
    !!r.currently_done_by &&
    /liz/i.test(r.currently_done_by) &&
    (!r.can_be_delegated_to || r.can_be_delegated_to.trim() === "");

  const total = rows.length;
  const lizOnly = rows.filter(isLizOnly).length;
  const pct = total === 0 ? 0 : Math.round((lizOnly / total) * 100);

  // Per category
  const byCat = new Map<string, { total: number; lizOnly: number }>();
  rows.forEach((r) => {
    const cat = r.category?.trim() || "Uncategorized";
    const cur = byCat.get(cat) ?? { total: 0, lizOnly: 0 };
    cur.total += 1;
    if (isLizOnly(r)) cur.lizOnly += 1;
    byCat.set(cat, cur);
  });
  const categories = Array.from(byCat.entries())
    .map(([cat, v]) => ({ cat, ...v, pct: Math.round((v.lizOnly / v.total) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const tone =
    pct >= 70
      ? "text-rose-500 border-rose-500/30 bg-rose-500/5"
      : pct >= 40
        ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
        : "text-emerald-500 border-emerald-500/30 bg-emerald-500/5";

  return (
    <section className="panel-raised p-5">
      <header className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-[color:var(--iris-violet)]" />
        <h2 className="text-sm font-semibold">Liz dependency</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {lizOnly} of {total} responsibilities have no delegate identified
        </span>
      </header>

      <div className="grid items-center gap-5 md:grid-cols-[200px_1fr]">
        {/* Gauge */}
        <div className={cn("relative grid h-[140px] w-[140px] place-items-center rounded-full border-4", tone)}>
          <Gauge pct={pct} />
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-3xl font-semibold tracking-tight">{pct}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">on Liz</div>
            </div>
          </div>
        </div>

        {/* Per-category bars */}
        <div className="space-y-1.5">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No category breakdown yet.</p>
          ) : (
            categories.map((c) => (
              <div key={c.cat} className="grid grid-cols-[140px_1fr_50px] items-center gap-2 text-xs">
                <span className="truncate text-muted-foreground">{c.cat}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      c.pct >= 70 ? "bg-rose-500" : c.pct >= 40 ? "bg-amber-500" : "bg-emerald-500",
                    )}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <span className="text-right font-mono text-[11px] text-muted-foreground">
                  {c.lizOnly}/{c.total}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {pct >= 60 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            High dependency. Identify <code className="font-mono">can_be_delegated_to</code> for the top categories
            above to move responsibilities off your plate.
          </span>
        </div>
      )}
    </section>
  );
}

function Gauge({ pct }: { pct: number }) {
  // Decorative SVG ring filling clockwise
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct / 100);
  return (
    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="8" className="stroke-muted/40" />
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        className="stroke-current"
        style={{ strokeDasharray: circ, strokeDashoffset: offset, transition: "stroke-dashoffset 600ms ease" }}
      />
    </svg>
  );
}
