import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TENETS_BY_CATEGORY } from "@/lib/tenets";
import { Filter, Search, X, Blocks } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/components/")({
  component: ComponentsListPage,
});

interface ComponentRow {
  id: string;
  name: string;
  description: string | null;
  current_maturity_level: string | null;
  quality_status: string | null;
  related_domains: string[] | null;
  related_tenets: string[] | null;
  updated_at: string;
}

interface DomainRow {
  slug: string;
  name: string;
}

const ALL = "__all__";

function ComponentsListPage() {
  const [domain, setDomain] = useState<string>(ALL);
  const [tenet, setTenet] = useState<string>(ALL);
  const [q, setQ] = useState("");

  const { data: domains = [] } = useQuery<DomainRow[]>({
    queryKey: ["domains-min"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("domains")
        .select("slug, name")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery<ComponentRow[]>({
    queryKey: ["components-list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("components")
        .select("id, name, description, current_maturity_level, quality_status, related_domains, related_tenets, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (domain !== ALL && !(r.related_domains ?? []).includes(domain)) return false;
      if (tenet !== ALL && !(r.related_tenets ?? []).includes(tenet)) return false;
      if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, domain, tenet, q]);

  const domainName = (slug: string) => domains.find((d) => d.slug === slug)?.name ?? slug;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris/10 text-[color:var(--iris-violet)]">
          <Blocks className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Components</h1>
          <p className="text-sm text-muted-foreground">
            Reusable building blocks. Filter by Domain (universal) and Tenet (industry).
          </p>
        </div>
        <Link to="/components/$id" params={{ id: "new" }}>
          <Button size="sm">+ New component</Button>
        </Link>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3 w-3" /> Filters
          </div>

          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger className="h-8 w-[220px] text-xs">
              <SelectValue placeholder="Domain (universal)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All domains</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.slug} value={d.slug}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tenet} onValueChange={setTenet}>
            <SelectTrigger className="h-8 w-[260px] text-xs">
              <SelectValue placeholder="Tenet (industry)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tenets</SelectItem>
              {(["Foundation", "Specialization", "Advanced", "Mastery"] as const).map((cat) => (
                <SelectGroup key={cat}>
                  <SelectLabel className="text-[10px] uppercase tracking-wider">{cat}</SelectLabel>
                  {TENETS_BY_CATEGORY[cat].map((t) => (
                    <SelectItem key={t.code} value={t.name}>
                      {t.code} · {t.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-8 w-[200px] pl-7 text-xs"
            />
          </div>
        </div>

        {(domain !== ALL || tenet !== ALL) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {domain !== ALL && (
              <button
                onClick={() => setDomain(ALL)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-iris-soft px-2 py-0.5 text-[10px] font-medium hover:bg-iris/20"
              >
                Domain: {domainName(domain)} <X className="h-2.5 w-2.5" />
              </button>
            )}
            {tenet !== ALL && (
              <button
                onClick={() => setTenet(ALL)}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--success)]/30 bg-[color:var(--success)]/15 px-2 py-0.5 text-[10px] font-medium hover:bg-[color:var(--success)]/25"
              >
                Tenet: {tenet} <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading components…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No components match these filters.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to="/components/$id"
                params={{ id: c.id }}
                className={cn(
                  "block px-4 py-3 transition-colors hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.current_maturity_level && (
                        <Badge variant="secondary" className="h-4 text-[9px] uppercase tracking-wider">
                          {c.current_maturity_level}
                        </Badge>
                      )}
                      {c.quality_status && (
                        <Badge variant="outline" className="h-4 text-[9px]">
                          {c.quality_status}
                        </Badge>
                      )}
                    </div>
                    {c.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(c.related_domains ?? []).map((d) => (
                        <span
                          key={`d-${d}`}
                          className="inline-flex items-center rounded-full border border-border bg-iris-soft px-1.5 py-0.5 text-[9px]"
                        >
                          {domainName(d)}
                        </span>
                      ))}
                      {(c.related_tenets ?? []).map((t) => (
                        <span
                          key={`t-${t}`}
                          className="inline-flex items-center rounded-full border border-[color:var(--success)]/30 bg-[color:var(--success)]/15 px-1.5 py-0.5 text-[9px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
