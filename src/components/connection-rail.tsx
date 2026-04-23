// Connection rail (Zone 3) — vertical "walk the graph" rail. Same data source
// as <WalkMenu/> but pinned open as a sidebar on detail pages.

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Check, Tag } from "lucide-react";
import { resolveWalk, type WalkKind, type WalkEdges, type WalkLink } from "@/lib/walk-menu-resolvers";
import { cn } from "@/lib/utils";

const VERBS: { key: keyof WalkEdges; label: string; icon: typeof ArrowUp; hint: string }[] = [
  { key: "up", label: "Up", icon: ArrowUp, hint: "Parents this rolls into" },
  { key: "down", label: "Down", icon: ArrowDown, hint: "Children that roll into this" },
  { key: "produces", label: "Produces", icon: ArrowRight, hint: "Outputs / artifacts" },
  { key: "consumes", label: "Consumes", icon: ArrowLeft, hint: "Inputs / sources" },
  { key: "advances", label: "Advances", icon: Check, hint: "Components / capabilities moved forward" },
  { key: "about", label: "Tagged", icon: Tag, hint: "Domains, tenets, related entities" },
];

interface Props {
  kind: WalkKind;
  id: string;
  className?: string;
}

export function ConnectionRail({ kind, id, className }: Props) {
  const { data, isLoading } = useQuery<WalkEdges>({
    queryKey: ["walk", kind, id],
    queryFn: () => resolveWalk(kind, id),
    staleTime: 30_000,
  });

  return (
    <aside className={cn("rounded-2xl border border-border bg-card p-3", className)}>
      <header className="mb-3 px-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Connections
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Walk the graph</p>
      </header>

      {isLoading ? (
        <div className="p-3 text-xs text-muted-foreground">Loading…</div>
      ) : (
        <ul className="space-y-1">
          {VERBS.map((v) => {
            const links: WalkLink[] = data?.[v.key] ?? [];
            const Icon = v.icon;
            return (
              <li key={v.key} className="rounded-xl border border-border/40 bg-background/40 p-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-[color:var(--iris-violet)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {v.label}
                  </span>
                  <span className="ml-auto rounded-full bg-muted px-1.5 py-0 text-[9px] font-medium text-muted-foreground">
                    {links.length}
                  </span>
                </div>
                {links.length === 0 ? (
                  <p className="px-1 text-[10px] text-muted-foreground/70" title={v.hint}>
                    {v.hint}
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {links.slice(0, 6).map((link, i) => (
                      <li key={`${v.key}-${i}`}>
                        <ConnectionLink link={link} />
                      </li>
                    ))}
                    {links.length > 6 && (
                      <li className="px-1 text-[10px] text-muted-foreground">
                        +{links.length - 6} more
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function ConnectionLink({ link }: { link: WalkLink }) {
  // WalkLink only exposes label/to/params/hint — render an unstyled <Link>
  // using the `to` string directly.
  return (
    <Link
      to={link.to}
      params={link.params ?? {}}
      title={link.hint}
      className="block truncate rounded px-1 py-0.5 text-[11px] hover:bg-iris-soft/50"
    >
      {link.label}
    </Link>
  );
}
