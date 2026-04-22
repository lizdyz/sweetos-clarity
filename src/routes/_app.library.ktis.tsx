import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Radar, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KtiPanel } from "@/components/kti-panel";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/library/ktis")({
  component: KtisIndex,
});

interface KtiRow {
  id: string;
  name: string;
  status: "active" | "paused" | "fired";
  scan_frequency: string;
  threshold_definition: string;
  domain_id: string | null;
  relationship_id: string | null;
  domain?: { name: string } | null;
  relationship?: { name: string } | null;
}

function KtisIndex() {
  const { data: rows = [] } = useQuery({
    queryKey: ["ktis", "library-index"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("key_trend_indicators")
        .select(
          "id, name, status, scan_frequency, threshold_definition, domain_id, relationship_id, domain:domains(name), relationship:relationships(name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KtiRow[];
    },
  });

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        icon={<Radar className="h-5 w-5" />}
        title="Key Trend Indicators"
        purpose="Forward-facing signal trackers — they tell us where things are going before they arrive. Different from KPIs (which measure the past) and from Sparks (which are atomic interactions)."
        whatYouCanDo={[
          "Define a threshold and a trigger action (task, bot alert, flightdeck flag, or all)",
          "Scope a KTI to one relationship, or leave it universal",
          "Watch the radar fire when external signals cross your line",
        ]}
      />

      <KtiPanel />

      <Card className="panel-raised p-4">
        <h3 className="mb-2 text-sm font-semibold tracking-tight">All KTIs</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {rows.map((k) => (
              <li key={k.id} className="flex items-center gap-3 py-2 text-sm">
                <Link
                  to="/library/ktis/$id"
                  params={{ id: k.id }}
                  className="flex flex-1 items-center gap-2 hover:text-[color:var(--iris-violet)]"
                >
                  <span className="font-medium">{k.name}</span>
                  <ArrowUpRight className="h-3 w-3 opacity-50" />
                </Link>
                {k.domain?.name && (
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {k.domain.name}
                  </span>
                )}
                {k.relationship?.name && (
                  <span className="rounded-full bg-iris-soft/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[color:var(--iris-violet)]">
                    {k.relationship.name}
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                    k.status === "fired" && "bg-amber-500/15 text-amber-500",
                    k.status === "active" && "bg-emerald-500/15 text-emerald-600",
                    k.status === "paused" && "bg-muted/40 text-muted-foreground",
                  )}
                >
                  {k.status}
                </span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {k.scan_frequency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
