import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Link } from "@tanstack/react-router";
import { Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapabilityRow {
  journey_id: string;
  journey_name: string;
  component_count: number;
  l3_plus_count: number;
  l3_plus_component_ids: string[] | null;
  l3_plus_component_names: string[] | null;
  capability_state: "none" | "emerging" | "partial" | "capable";
}

const STATE_CFG: Record<CapabilityRow["capability_state"], { label: string; tone: string }> = {
  capable: {
    label: "Capable",
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  partial: {
    label: "Partial",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  emerging: {
    label: "Emerging",
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  none: {
    label: "Empty",
    tone: "border-border bg-muted text-muted-foreground",
  },
};

/**
 * Derived Capabilities panel — Components ≥ L3 grouped by Journey.
 * Per Wave 6 reconciliation issue #1: Capability is a computed view,
 * NOT a stored entity.
 */
export function CapabilitiesDerivedPanel() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["capabilities-derived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capabilities_derived")
        .select("*")
        .order("l3_plus_count", { ascending: false });
      if (error) return [];
      return (data ?? []) as CapabilityRow[];
    },
  });

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Capabilities (derived)</h2>
          <p className="text-[11px] text-muted-foreground">
            Components at L3+ rolled up by Journey. Capability is computed, not stored.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 rounded-xl border border-border bg-surface/40 animate-pulse" />
      ) : data.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/40 p-4 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          No journeys yet — capabilities will appear once Components reach L3.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((row) => {
            const cfg = STATE_CFG[row.capability_state];
            return (
              <li
                key={row.journey_id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    to="/journeys/$id"
                    params={{ id: row.journey_id }}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {row.journey_name}
                  </Link>
                  <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", cfg.tone)}>
                    {cfg.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {row.l3_plus_count}/{row.component_count} Components at L3+
                </div>
                {row.l3_plus_component_names && row.l3_plus_component_names.length > 0 && (
                  <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {row.l3_plus_component_names.join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
