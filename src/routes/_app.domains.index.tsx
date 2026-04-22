import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { sb } from "@/lib/sb";

export const Route = createFileRoute("/_app/domains/")({
  component: DomainsIndex,
});

interface DomainRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
}

interface TenetRow {
  id: string;
  domain_id: string;
}

function DomainsIndex() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [tenetCounts, setTenetCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: ds }, { data: ts }] = await Promise.all([
        sb.from("domains").select("*").eq("enabled", true).order("sort_order"),
        sb.from("tenets").select("id, domain_id").eq("enabled", true),
      ]);
      setDomains((ds as DomainRow[]) ?? []);
      const counts: Record<string, number> = {};
      ((ts as TenetRow[]) ?? []).forEach((t) => {
        counts[t.domain_id] = (counts[t.domain_id] ?? 0) + 1;
      });
      setTenetCounts(counts);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-6 py-6">
      <header className="mb-6 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-iris-cyan/30 to-iris-violet/30 text-foreground shadow-[var(--shadow-glass)]">
          <Compass className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Domains of Excellence</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The 22 universal areas of a business where we define what "excellent" looks like.
            Click a domain to open its crib sheet, the 8 BizzyBot perspectives, and the L1→L5 excellence matrix.
            Tenets (industry-specific best-practice anchors) live in their own tab.
          </p>
        </div>
        <Link
          to="/tenets"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-iris-soft/40"
        >
          Browse tenets →
        </Link>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading domains…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {domains.map((d) => (
            <Link
              key={d.id}
              to="/domains/$slug"
              params={{ slug: d.slug }}
              className="group"
            >
              <Card className="relative h-full overflow-hidden border-border/60 bg-surface-raised/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: d.color }}
                />
                <h2 className="mb-2 text-lg font-semibold tracking-tight">{d.name}</h2>
                <p className="text-sm text-muted-foreground line-clamp-3">{d.description}</p>
                <div className="mt-4 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {tenetCounts[d.id] ?? 0} tenets linked
                  </span>
                  <span className="font-medium text-[color:var(--iris-violet)] opacity-0 transition-opacity group-hover:opacity-100">
                    Open →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
