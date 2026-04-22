import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";

interface Lens {
  id: string;
  code: string;
  name: string;
  tagline: string;
  accent_color: string;
  bizzybot_emoji: string | null;
  stages: string[];
  what_it_asks: string | null;
  best_use: string | null;
}

interface Props {
  /** Optional subject so each tile can show "what would this lens say about X". */
  subjectKind?: "domain" | "tenet" | "component" | "relationship" | "project" | "person";
  subjectId?: string;
  subjectLabel?: string;
}

/**
 * Replaces the old single-block LensWall. Each Lens (BizzyBot) gets its own
 * tile; clicking expands inline to reveal stages + a per-subject perspective
 * link. No navigation required.
 */
export function LensTileGrid({ subjectKind, subjectId, subjectLabel }: Props) {
  const { data: lenses = [] } = useQuery({
    queryKey: ["lenses-enabled"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lenses")
        .select("id, code, name, tagline, accent_color, bizzybot_emoji, stages, what_it_asks, best_use")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Lens[];
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[color:var(--iris-violet)]" />
        <h2 className="text-sm font-semibold tracking-tight">BizzyBot Lenses</h2>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {lenses.length} perspectives
          {subjectLabel ? ` · applied to ${subjectLabel}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lenses.map((l) => (
          <LensTile key={l.id} lens={l} subjectKind={subjectKind} subjectId={subjectId} />
        ))}
      </div>
    </div>
  );
}

function LensTile({
  lens,
  subjectKind,
  subjectId,
}: {
  lens: Lens;
  subjectKind?: Props["subjectKind"];
  subjectId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card
      className={cn(
        "panel-raised group overflow-hidden p-0 transition-all",
        open && "ring-1",
      )}
      style={open ? { boxShadow: `0 0 0 1px ${lens.accent_color}55` } : undefined}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg shadow-[var(--shadow-glass)]"
          style={{ background: `${lens.accent_color}22`, color: lens.accent_color }}
        >
          {lens.bizzybot_emoji ?? "✨"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-4 px-1 text-[9px]">
              {lens.code}
            </Badge>
            <span className="truncate text-sm font-semibold tracking-tight">{lens.name}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{lens.tagline}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/50 p-3 text-xs">
          {lens.what_it_asks && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                What it asks
              </div>
              <p className="text-foreground/80">{lens.what_it_asks}</p>
            </div>
          )}
          {lens.stages.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Stages
              </div>
              <ol className="space-y-1">
                {lens.stages.map((s, i) => (
                  <li key={s} className="rounded-md border border-border/40 bg-background px-2 py-1">
                    <span className="mr-1.5 text-[10px] font-mono text-muted-foreground">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {lens.best_use && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Best for
              </div>
              <p className="text-foreground/80">{lens.best_use}</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <Link
              to="/settings/lenses/$id"
              params={{ id: lens.id }}
              className="text-[11px] font-medium text-[color:var(--iris-violet)] hover:underline"
            >
              Edit prompt →
            </Link>
            {subjectKind && subjectId && (
              <a
                href={`/bizzybots?lens=${lens.code}&subjectKind=${subjectKind}&subjectId=${subjectId}`}
                className="text-[11px] font-medium text-[color:var(--iris-violet)] hover:underline"
              >
                Apply to subject →
              </a>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
