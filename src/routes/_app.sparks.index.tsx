import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityListPage } from "@/components/entity-workspace";
import { SparkProvenanceChip } from "@/components/spark-provenance-chip";
import { ScopeChip } from "@/components/scope-chip";
import { PageHeader } from "@/components/page-header";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sparks/")({
  component: SparksIndex,
});

interface RecentSpark {
  id: string;
  name: string;
  generated_by_kind: "system" | "agent" | "workflow" | null;
  origin_event: string | null;
  generator_operator_id: string | null;
  scope: string | null;
  relationship_id: string | null;
}

type ScopeFilter = "internal" | "client" | "all";

function SparksIndex() {
  // Default = Internal so client SweetSync work doesn't pollute Liz's view.
  const [filter, setFilter] = useState<ScopeFilter>("internal");

  const { data: recent = [] } = useQuery({
    queryKey: ["sparks", "provenance-preview", filter],
    queryFn: async () => {
      let q = supabase
        .from("sparks" as never)
        .select("id, name, generated_by_kind, origin_event, generator_operator_id, scope, relationship_id")
        .order("created_at", { ascending: false })
        .limit(6);
      if (filter !== "all") q = q.eq("scope", filter);
      const { data, error } = await q;
      if (error) return [];
      return (data ?? []) as unknown as RecentSpark[];
    },
  });

  const operatorIds = Array.from(
    new Set(recent.map((r) => r.generator_operator_id).filter((x): x is string => Boolean(x))),
  );
  const { data: operatorMap = {} } = useQuery({
    queryKey: ["operators", "names", operatorIds.join(",")],
    enabled: operatorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("operators")
        .select("id, name")
        .in("id", operatorIds);
      const m: Record<string, string> = {};
      for (const r of data ?? []) m[r.id] = r.name;
      return m;
    },
  });

  return (
    <div className="space-y-4 px-6 pt-5">
      <PageHeader
        title="Sparks"
        icon={<Sparkles className="h-5 w-5" />}
        purpose="The atomic unit of self-paced advancement. Sessions move things forward in a guided cadence; Sparks let progress happen between sessions. Both advance the same Components."
        whatYouCanDo={[
          "Filter by Internal (your own work) vs Client SweetSync",
          "Confirm, edit, or skip each one",
          "Trace provenance back to the Curator or Workflow that spawned it",
        ]}
      />

      <ScopeTabs value={filter} onChange={setFilter} />

      {recent.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Recent provenance
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Where the latest sparks came from
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    to="/sparks/$id"
                    params={{ id: s.id }}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {s.name}
                  </Link>
                  <ScopeChip scope={s.scope} relationshipId={s.relationship_id} />
                </div>
                <div className="mt-1.5">
                  <SparkProvenanceChip
                    kind={s.generated_by_kind}
                    generatorName={
                      s.generator_operator_id ? operatorMap[s.generator_operator_id] : undefined
                    }
                    originEvent={s.origin_event}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <EntityListPage entityKey="sparks" />
    </div>
  );
}

function ScopeTabs({ value, onChange }: { value: ScopeFilter; onChange: (v: ScopeFilter) => void }) {
  const opts: Array<{ key: ScopeFilter; label: string; hint: string }> = [
    { key: "internal", label: "Internal (mine)", hint: "Your own SweetBOS work" },
    { key: "client", label: "Client SweetSync", hint: "Sparks anchored to a client relationship" },
    { key: "all", label: "All", hint: "Everything" },
  ];
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface/60 p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          title={o.hint}
          className={cn(
            "rounded-lg px-3 py-1 font-medium transition-colors",
            value === o.key
              ? "bg-iris text-white shadow-[var(--shadow-glow)]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
