import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb } from "@/lib/sb";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Radar, Plus, Loader2, RefreshCw, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { KtiForm } from "@/components/kti-form";

interface KtiRow {
  id: string;
  name: string;
  description: string | null;
  threshold_definition: string;
  status: "active" | "paused" | "fired";
  scan_frequency: "daily" | "weekly" | "monthly";
  trigger_action: "task" | "bot_alert" | "flightdeck_flag" | "all";
  domain_id: string | null;
  relationship_id: string | null;
}

interface ScanRow {
  id: string;
  scanned_at: string;
  observed_value: string | null;
  direction: "up" | "down" | "flat" | "fired" | "unknown";
  fired: boolean;
  notes: string | null;
}

interface Props {
  /** Filter by relationship. null = universal-only. undefined = no filter (global view). */
  relationshipId?: string | null;
  /** Filter by domain. */
  domainId?: string | null;
  /** Render compact (for embedding in side panels). */
  compact?: boolean;
}

const DIRECTION_GLYPH: Record<ScanRow["direction"], string> = {
  up: "↑",
  down: "↓",
  flat: "→",
  fired: "🔥",
  unknown: "·",
};

const DIRECTION_TONE: Record<ScanRow["direction"], string> = {
  up: "text-emerald-500",
  down: "text-rose-500",
  flat: "text-muted-foreground",
  fired: "text-amber-500",
  unknown: "text-muted-foreground/60",
};

/**
 * Forward-looking radar. Renders KTIs as tiles with direction glyphs.
 * Mounted in the Signal Scanner surface, on Domain detail, and on Relationship detail.
 * See `mem://features/ktis.md`.
 */
export function KtiPanel({ relationshipId, domainId, compact = false }: Props) {
  const qc = useQueryClient();
  const queryKey = ["ktis", "panel", { relationshipId, domainId }];

  const { data: ktis = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = sb
        .from("key_trend_indicators")
        .select(
          "id, name, description, threshold_definition, status, scan_frequency, trigger_action, domain_id, relationship_id",
        )
        .order("created_at", { ascending: false });
      if (relationshipId === null) {
        q = q.is("relationship_id", null);
      } else if (typeof relationshipId === "string") {
        // include both universal + this relationship's KTIs
        q = q.or(`relationship_id.is.null,relationship_id.eq.${relationshipId}`);
      }
      if (domainId) q = q.eq("domain_id", domainId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as KtiRow[];
    },
  });

  const ktiIds = useMemo(() => ktis.map((k) => k.id), [ktis]);
  const { data: latestScans = {} } = useQuery({
    queryKey: ["ktis", "latest-scans", ktiIds],
    enabled: ktiIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("kti_scans")
        .select("id, kti_id, scanned_at, observed_value, direction, fired, notes")
        .in("kti_id", ktiIds)
        .order("scanned_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, ScanRow> = {};
      for (const row of (data ?? []) as Array<ScanRow & { kti_id: string }>) {
        if (!map[row.kti_id]) map[row.kti_id] = row;
      }
      return map;
    },
  });

  const scan = useMutation({
    mutationFn: async (ktiId: string) => {
      const { data, error } = await supabase.functions.invoke("scan-signals", {
        body: { mode: "kti", kti_id: ktiId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Scan complete");
      qc.invalidateQueries({ queryKey: ["ktis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="panel-raised space-y-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-[color:var(--iris-violet)]" />
          <h3 className="text-sm font-semibold tracking-tight">Forward radar</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            What we're watching · before it arrives
          </span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Key Trend Indicator</DialogTitle>
            </DialogHeader>
            <KtiForm
              relationshipId={relationshipId ?? null}
              domainId={domainId ?? null}
              onCreated={() => qc.invalidateQueries({ queryKey: ["ktis"] })}
            />
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading radar…
        </div>
      ) : ktis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 px-4 py-6 text-center text-sm text-muted-foreground">
          No KTIs configured. Add one to start watching.
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-2",
            compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {ktis.map((k) => {
            const latest = latestScans[k.id];
            const dir = latest?.direction ?? "unknown";
            return (
              <Sheet key={k.id}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "group flex flex-col gap-1.5 rounded-xl border border-border/50 bg-card/60 p-3 text-left transition-all hover:border-[color:var(--iris-violet)]/40 hover:shadow-[var(--shadow-glass)]",
                      k.status === "fired" && "border-amber-500/40 bg-amber-500/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{k.name}</span>
                      <span className={cn("text-lg leading-none", DIRECTION_TONE[dir])}>
                        {DIRECTION_GLYPH[dir]}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {k.threshold_definition}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      <span>{k.scan_frequency}</span>
                      <span>·</span>
                      <span
                        className={cn(
                          k.status === "fired" && "text-amber-500",
                          k.status === "paused" && "text-muted-foreground/60",
                        )}
                      >
                        {k.status}
                      </span>
                      {latest && (
                        <>
                          <span>·</span>
                          <span>last {timeAgo(latest.scanned_at)}</span>
                        </>
                      )}
                    </div>
                  </button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <span className={cn("text-xl leading-none", DIRECTION_TONE[dir])}>
                        {DIRECTION_GLYPH[dir]}
                      </span>
                      {k.name}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    {k.description && (
                      <p className="text-sm text-muted-foreground">{k.description}</p>
                    )}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Threshold
                      </div>
                      <p className="mt-1 text-sm">{k.threshold_definition}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => scan.mutate(k.id)}
                      disabled={scan.isPending}
                      className="gap-1.5"
                    >
                      {scan.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Run scan now
                    </Button>
                    <ScanHistory ktiId={k.id} />
                    <Link
                      to="/library/ktis/$id"
                      params={{ id: k.id }}
                      className="inline-flex items-center gap-1 text-xs text-[color:var(--iris-violet)] hover:underline"
                    >
                      Open full record <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ScanHistory({ ktiId }: { ktiId: string }) {
  const { data: scans = [] } = useQuery({
    queryKey: ["kti_scans", ktiId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("kti_scans")
        .select("id, scanned_at, observed_value, direction, fired, notes")
        .eq("kti_id", ktiId)
        .order("scanned_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ScanRow[];
    },
  });
  if (scans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 px-3 py-3 text-xs text-muted-foreground">
        No scans yet.
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Recent scans
      </div>
      <ul className="space-y-1">
        {scans.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-card/40 px-2 py-1 text-xs"
          >
            <span className={cn("text-base leading-none", DIRECTION_TONE[s.direction])}>
              {DIRECTION_GLYPH[s.direction]}
            </span>
            <span className="flex-1 truncate text-muted-foreground">
              {s.observed_value ?? s.notes ?? "no observation"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {timeAgo(s.scanned_at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
