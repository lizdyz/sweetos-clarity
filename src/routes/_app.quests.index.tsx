import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityListPage } from "@/components/entity-workspace";
import { ScopeChip } from "@/components/scope-chip";
import { PageHeader } from "@/components/page-header";
import { Compass } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/quests/")({
  component: QuestsIndex,
});

type ScopeFilter = "internal" | "client" | "all";

interface QuestPreview {
  id: string;
  name: string;
  status: string | null;
  scope: string | null;
  relationship_id: string | null;
}

function QuestsIndex() {
  const [filter, setFilter] = useState<ScopeFilter>("internal");

  const { data: recent = [] } = useQuery({
    queryKey: ["quests", "preview", filter],
    queryFn: async () => {
      let q = supabase
        .from("quests")
        .select("id, name, status, scope, relationship_id")
        .order("updated_at", { ascending: false })
        .limit(6);
      if (filter !== "all") q = q.eq("scope", filter);
      const { data } = await q;
      return (data ?? []) as QuestPreview[];
    },
  });

  return (
    <div className="space-y-4 px-6 pt-5">
      <PageHeader
        title="Quests"
        icon={<Compass className="h-5 w-5" />}
        purpose="Quests group Sparks to advance a specific Component. Sessions advance through guided cadence; Quests self-pace between sessions. Both write to the same Components."
        whatYouCanDo={[
          "Filter by Internal (your own work) vs Client SweetSync",
          "Open a Quest to see its core workflow and Components advanced",
          "Anchor any Quest to a relationship to make it client-facing",
        ]}
      />

      <ScopeTabs value={filter} onChange={setFilter} />

      {recent.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/60 p-4">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((q) => (
              <li key={q.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{q.name}</span>
                  <ScopeChip scope={q.scope} relationshipId={q.relationship_id} />
                </div>
                {q.status && (
                  <div className="mt-1 text-[11px] text-muted-foreground">{q.status}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <EntityListPage entityKey="quests" />
    </div>
  );
}

function ScopeTabs({ value, onChange }: { value: ScopeFilter; onChange: (v: ScopeFilter) => void }) {
  const opts: Array<{ key: ScopeFilter; label: string }> = [
    { key: "internal", label: "Internal (mine)" },
    { key: "client", label: "Client SweetSync" },
    { key: "all", label: "All" },
  ];
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface/60 p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
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
