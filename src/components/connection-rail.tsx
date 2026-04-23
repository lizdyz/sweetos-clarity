// Connection rail (Zone 3) — vertical "walk the graph" rail that mirrors WalkMenu
// but stays open as a sidebar on the detail page. Up · Down · Produces · Consumes
// · Advances · Tagged.

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
            const links = (data?.[v.key] ?? []) as WalkLink[];
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
                      <li key={`${link.kind}-${link.id}-${i}`}>
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

const ROUTE_FOR: Record<string, string> = {
  task: "/tasks/$id",
  project: "/projects/$id",
  component: "/components/$id",
  session: "/sessions/$id",
  workflow: "/workflows/$id",
  quest: "/quests/$id",
  spark: "/sparks/$id",
  decision: "/decisions/$id",
  relationship: "/relationships/$id",
  mission: "/missions/$id",
  journey: "/journeys/$id",
  playbook: "/playbooks/$id",
  document: "/documents/$id",
  persona: "/personas/$id",
  outcome: "/outcomes/$id",
};

function ConnectionLink({ link }: { link: WalkLink }) {
  const route = ROUTE_FOR[link.kind];
  const content = (
    <span className="flex items-center gap-1 truncate">
      <span className="rounded-full bg-muted/60 px-1 text-[8px] uppercase tracking-wider text-muted-foreground">
        {link.kind}
      </span>
      <span className="truncate">{link.label}</span>
    </span>
  );
  if (!route || !link.id) {
    return <span className="block px-1 py-0.5 text-[11px] text-muted-foreground">{content}</span>;
  }
  return (
    <Link
      to={route as "/tasks/$id"}
      params={{ id: link.id }}
      className="block rounded px-1 py-0.5 text-[11px] hover:bg-iris-soft/50"
    >
      {content}
    </Link>
  );
}
