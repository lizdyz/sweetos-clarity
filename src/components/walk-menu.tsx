import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Check, Info, MoreHorizontal } from "lucide-react";
import { resolveWalk, type WalkKind, type WalkEdges, type WalkLink } from "@/lib/walk-menu-resolvers";
import { cn } from "@/lib/utils";

const VERBS: { key: keyof WalkEdges; label: string; icon: typeof ArrowUp }[] = [
  { key: "up", label: "Up", icon: ArrowUp },
  { key: "down", label: "Down", icon: ArrowDown },
  { key: "produces", label: "Produces", icon: ArrowRight },
  { key: "consumes", label: "Consumes", icon: ArrowLeft },
  { key: "advances", label: "Advances", icon: Check },
  { key: "about", label: "About", icon: Info },
];

export function WalkMenu({ kind, id, className }: { kind: WalkKind; id: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery<WalkEdges>({
    queryKey: ["walk", kind, id],
    queryFn: () => resolveWalk(kind, id),
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground", className)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Walk graph"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-3 text-xs text-muted-foreground">Loading…</div>
        ) : (
          <ul className="divide-y divide-border/40">
            {VERBS.map((v) => {
              const links: WalkLink[] = data?.[v.key] ?? [];
              const Icon = v.icon;
              const empty = links.length === 0;
              return (
                <li key={v.key} className="py-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Icon className="h-2.5 w-2.5" />
                    {v.label}
                  </div>
                  {empty ? (
                    <div className="px-2 py-0.5 text-[11px] text-muted-foreground/60">—</div>
                  ) : (
                    <ul>
                      {links.slice(0, 4).map((l, i) => (
                        <li key={`${l.to}-${i}`}>
                          <Link
                            to={l.to as never}
                            params={l.params as never}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/50"
                          >
                            <span className="truncate">{l.label}</span>
                            {l.hint && <span className="shrink-0 text-[10px] text-muted-foreground">{l.hint}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
