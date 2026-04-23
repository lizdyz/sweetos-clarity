import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, GitFork, Gavel, Zap, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { TriageCard } from "@/components/triage-card";
import { sparkToTriageable } from "@/lib/triage-adapters";
import { useTriagePromote } from "@/lib/use-triage-promote";
import type { Triageable } from "@/lib/triageable";
import { DEFAULT_PROMOTE_OPTIONS } from "@/lib/triageable";

type Stage = "observe" | "choose" | "decide" | "act";

interface CardItem {
  id: string;
  kind: "proposal" | "spark" | "task" | "decision";
  title: string;
  meta?: string | null;
  href?: string;
}

const STAGE: { key: Stage; label: string; icon: typeof Eye; tone: string; caption: string }[] = [
  { key: "observe", label: "Observe", icon: Eye, tone: "from-sky-500/15 to-sky-500/5 border-sky-500/30", caption: "Signals · notes · proposals" },
  { key: "choose",  label: "Choose",  icon: GitFork, tone: "from-amber-500/15 to-amber-500/5 border-amber-500/30", caption: "Options · trade-offs · hypotheses" },
  { key: "decide",  label: "Decide",  icon: Gavel,  tone: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30", caption: "Logged decisions · rationale" },
  { key: "act",     label: "Act",     tone: "from-iris/15 to-iris/5 border-iris/30", icon: Zap, caption: "Tasks in motion · workflow runs" },
];

export function OCDACockpit() {
  const observeQ = useQuery({
    queryKey: ["ocda", "observe"],
    queryFn: async () => {
      const [proposals, sparks] = await Promise.all([
        sb.from("proposals")
          .select("id, entity_type, payload, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(15),
        sb.from("sparks")
          .select("id, name, origin_event, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
      ]);
      const items: CardItem[] = [];
      for (const p of (proposals.data ?? []) as Array<{ id: string; entity_type: string; payload: Record<string, unknown> | null }>) {
        items.push({
          id: `p-${p.id}`,
          kind: "proposal",
          title: readTitle(p.payload) ?? `(${p.entity_type})`,
          meta: p.entity_type,
          href: "/capture",
        });
      }
      for (const s of (sparks.data ?? []) as Array<{ id: string; name: string; origin_event: string | null }>) {
        items.push({
          id: `s-${s.id}`,
          kind: "spark",
          title: s.name,
          meta: s.origin_event ?? "system",
          href: `/sparks/${s.id}`,
        });
      }
      return items;
    },
  });

  const chooseQ = useQuery({
    queryKey: ["ocda", "choose"],
    queryFn: async () => {
      const { data } = await sb
        .from("tasks")
        .select("id, name, status")
        .eq("ocda_stage", "choose")
        .limit(30);
      return ((data ?? []) as Array<{ id: string; name: string; status: string | null }>).map((t) => ({
        id: `t-${t.id}`,
        kind: "task" as const,
        title: t.name,
        meta: t.status,
        href: `/tasks/${t.id}`,
      })) as CardItem[];
    },
  });

  const decideQ = useQuery({
    queryKey: ["ocda", "decide"],
    queryFn: async () => {
      const { data } = await sb
        .from("decisions")
        .select("id, decision, status, date_made")
        .order("date_made", { ascending: false, nullsFirst: false })
        .limit(20);
      return ((data ?? []) as Array<{ id: string; decision: string; status: string | null }>).map((d) => ({
        id: `d-${d.id}`,
        kind: "decision" as const,
        title: d.decision,
        meta: d.status ?? "decided",
        href: `/decisions/${d.id}`,
      })) as CardItem[];
    },
  });

  const actQ = useQuery({
    queryKey: ["ocda", "act"],
    queryFn: async () => {
      const { data } = await sb
        .from("tasks")
        .select("id, name, status")
        .or("status.eq.Doing,status.eq.In Progress,ocda_stage.eq.act")
        .limit(30);
      return ((data ?? []) as Array<{ id: string; name: string; status: string | null }>).map((t) => ({
        id: `t-${t.id}`,
        kind: "task" as const,
        title: t.name,
        meta: t.status,
        href: `/tasks/${t.id}`,
      })) as CardItem[];
    },
  });

  const byStage = useMemo(
    () => ({
      observe: observeQ.data ?? [],
      choose: chooseQ.data ?? [],
      decide: decideQ.data ?? [],
      act: actQ.data ?? [],
    }),
    [observeQ.data, chooseQ.data, decideQ.data, actQ.data],
  );

  const loading = observeQ.isLoading || chooseQ.isLoading || decideQ.isLoading || actQ.isLoading;

  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading OCDA stack…
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {STAGE.map(({ key, label, icon: Icon, tone, caption }) => {
          const items = byStage[key];
          return (
            <Card
              key={key}
              className={cn(
                "panel-raised flex min-h-[60vh] flex-col gap-2 border bg-gradient-to-b p-3",
                tone,
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
                </div>
                <span className="text-[10px] text-muted-foreground">{items.length}</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {caption}
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto pt-1">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-background/50 p-4 text-center text-[11px] text-muted-foreground">
                    Nothing here yet.
                  </div>
                ) : (
                  items.map((it) => (
                    <a
                      key={it.id}
                      href={it.href}
                      className="block rounded-lg border border-border/60 bg-background/80 px-2.5 py-2 text-xs shadow-[var(--shadow-glass)] transition hover:border-iris/40"
                    >
                      <div className="truncate font-medium">{it.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge variant="outline" className="h-4 px-1 text-[9px] capitalize">
                          {it.kind}
                        </Badge>
                        {it.meta && (
                          <span className="truncate text-[10px] text-muted-foreground">{it.meta}</span>
                        )}
                      </div>
                    </a>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function readTitle(payload: Record<string, unknown> | null): string | undefined {
  if (!payload) return undefined;
  for (const k of ["name", "title", "campaign_name", "task", "decision"]) {
    const v = payload[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}
