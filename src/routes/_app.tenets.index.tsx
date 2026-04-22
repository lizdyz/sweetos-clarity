import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";

export const Route = createFileRoute("/_app/tenets/")({
  component: TenetsIndex,
});

interface TenetRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  industry_id: string | null;
  domain_id: string | null;
  industries?: { name: string } | null;
  domains?: { name: string; color: string } | null;
}

function TenetsIndex() {
  const [search, setSearch] = useState("");

  const { data: tenets = [], isLoading } = useQuery({
    queryKey: ["tenets-index"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("tenets")
        .select(
          "id, slug, name, description, category, industry_id, domain_id, industries (name), domains (name, color)",
        )
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TenetRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return tenets;
    const q = search.toLowerCase();
    return tenets.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q),
    );
  }, [tenets, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, TenetRow[]>();
    filtered.forEach((t) => {
      const key = t.industries?.name ?? "Universal";
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    });
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <div className="px-6 py-6">
      <header className="mb-6 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300/40 to-iris-violet/30 text-foreground shadow-[var(--shadow-glass)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tenets</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Industry-specific best-practice anchors that sharpen the universal Domains.
            A tenet says "for this industry, here's what 'good' looks like." Click one to see
            its crib sheet and the BizzyBot perspectives applied to it.
          </p>
        </div>
        <Link
          to="/domains"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-iris-soft/40"
        >
          ← Back to domains
        </Link>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenets…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {tenets.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tenets…
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([industry, items]) => (
            <section key={industry}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {industry} · {items.length}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((t) => (
                  <Link
                    key={t.id}
                    to="/tenets/$slug"
                    params={{ slug: t.slug }}
                    className="group"
                  >
                    <Card className="h-full border-border/60 bg-surface-raised/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold tracking-tight">{t.name}</h3>
                        {t.category && (
                          <Badge variant="outline" className="h-4 shrink-0 text-[9px]">
                            {t.category}
                          </Badge>
                        )}
                      </div>
                      {t.domains?.name && (
                        <div className="mb-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: t.domains.color }}
                          />
                          {t.domains.name}
                        </div>
                      )}
                      <p className="line-clamp-3 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
