import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb } from "@/lib/sb";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Flame, Eye, AlertCircle, Plus, RefreshCw, Loader2, Radar, ArrowUpRight } from "lucide-react";
import { KtiForm } from "@/components/kti-form";
import {
  KtiSuggestionFromCapture,
  type SuggestedKtiPayload,
} from "@/components/sweetscan/kti-suggestion-from-capture";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  updated_at: string;
}

interface ScanRow {
  id: string;
  kti_id: string;
  scanned_at: string;
  fired: boolean;
  observed_value: string | null;
}

interface SuggestionRow {
  id: string;
  summary: string | null;
  created_at: string;
  suggested_kti_payload: SuggestedKtiPayload | null;
}

const FRESHNESS_DAYS: Record<KtiRow["scan_frequency"], number> = {
  daily: 2,
  weekly: 10,
  monthly: 40,
};

/**
 * Watchlist Dashboard — the new home of SweetScan.
 *
 * Three piles:
 *   🔥 Active fires    — KTIs with a recent fired scan
 *   👁  Watching       — KTIs scanning normally
 *   ⚠  Needs setup     — KTIs paused or with no recent scan or no domain
 *
 * Plus a "Suggested from recent captures" pile fed by inbound_signals
 * carrying a `suggested_kti_payload` from the AI.
 *
 * See `mem://design/sweetscan-watchlist-first.md`.
 */
export function WatchlistDashboard() {
  const qc = useQueryClient();

  const { data: ktis = [], isLoading } = useQuery<KtiRow[]>({
    queryKey: ["sweetscan", "watchlist", "ktis"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("key_trend_indicators")
        .select(
          "id, name, description, threshold_definition, status, scan_frequency, trigger_action, domain_id, relationship_id, updated_at",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KtiRow[];
    },
  });

  const ktiIds = useMemo(() => ktis.map((k) => k.id), [ktis]);
  const { data: latestScans = {} } = useQuery({
    queryKey: ["sweetscan", "watchlist", "latest-scans", ktiIds],
    enabled: ktiIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("kti_scans")
        .select("id, kti_id, scanned_at, fired, observed_value")
        .in("kti_id", ktiIds)
        .order("scanned_at", { ascending: false });
      if (error) throw error;
      const m: Record<string, ScanRow> = {};
      for (const row of (data ?? []) as ScanRow[]) {
        if (!m[row.kti_id]) m[row.kti_id] = row;
      }
      return m;
    },
  });

  const { data: suggestions = [] } = useQuery<SuggestionRow[]>({
    queryKey: ["sweetscan", "watchlist", "suggestions"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("inbound_signals")
        .select("id, summary, created_at, suggested_kti_payload")
        .not("suggested_kti_payload", "is", null)
        .neq("status", "routed")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as SuggestionRow[];
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
      qc.invalidateQueries({ queryKey: ["sweetscan"] });
      qc.invalidateQueries({ queryKey: ["ktis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const piles = useMemo(() => {
    const fires: KtiRow[] = [];
    const watching: KtiRow[] = [];
    const needsSetup: KtiRow[] = [];
    const now = Date.now();

    for (const k of ktis) {
      const last = latestScans[k.id];
      const stale =
        !last ||
        (now - new Date(last.scanned_at).getTime()) / 86400000 > FRESHNESS_DAYS[k.scan_frequency];

      if (k.status === "fired" || last?.fired) {
        fires.push(k);
      } else if (k.status === "paused" || stale || !k.threshold_definition) {
        needsSetup.push(k);
      } else {
        watching.push(k);
      }
    }
    return { fires, watching, needsSetup };
  }, [ktis, latestScans]);

  const firedThisWeek = useMemo(() => {
    const wk = Date.now() - 7 * 86400000;
    return Object.values(latestScans).filter(
      (s) => s.fired && new Date(s.scanned_at).getTime() >= wk,
    ).length;
  }, [latestScans]);

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your watchlist…
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold tracking-tight text-foreground">
            {ktis.length} KTI{ktis.length === 1 ? "" : "s"} watching
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Flame className="h-3 w-3" /> {firedThisWeek} fired this week
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{piles.watching.length} quiet</span>
          {piles.needsSetup.length > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-rose-600 dark:text-rose-400">
                {piles.needsSetup.length} needs config
              </span>
            </>
          )}
          {suggestions.length > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-[color:var(--iris-violet)]">
                {suggestions.length} suggested from captures
              </span>
            </>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add KTI to watch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Key Trend Indicator</DialogTitle>
            </DialogHeader>
            <KtiForm
              onCreated={() => qc.invalidateQueries({ queryKey: ["sweetscan", "watchlist"] })}
            />
          </DialogContent>
        </Dialog>
      </Card>

      {/* Tri-pile */}
      <div className="grid gap-3 md:grid-cols-3">
        <Pile
          tone="amber"
          icon={<Flame className="h-3.5 w-3.5" />}
          label="Active fires"
          count={piles.fires.length}
          empty="Nothing firing right now."
        >
          {piles.fires.map((k) => (
            <PileItem
              key={k.id}
              kti={k}
              latest={latestScans[k.id]}
              onScan={() => scan.mutate(k.id)}
              cta="Make Tasks"
              ctaTo="/library/ktis/$id"
            />
          ))}
        </Pile>

        <Pile
          tone="iris"
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Watching"
          count={piles.watching.length}
          empty="No active watches yet."
        >
          {piles.watching.map((k) => (
            <PileItem
              key={k.id}
              kti={k}
              latest={latestScans[k.id]}
              onScan={() => scan.mutate(k.id)}
              cta="Scan now"
              ctaTo="/library/ktis/$id"
            />
          ))}
        </Pile>

        <Pile
          tone="rose"
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          label="Needs setup"
          count={piles.needsSetup.length}
          empty="Everything's configured."
        >
          {piles.needsSetup.map((k) => (
            <PileItem
              key={k.id}
              kti={k}
              latest={latestScans[k.id]}
              onScan={() => scan.mutate(k.id)}
              cta="Configure"
              ctaTo="/library/ktis/$id"
            />
          ))}
        </Pile>
      </div>

      {/* Suggested from captures */}
      {suggestions.length > 0 && (
        <Card className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-[color:var(--iris-violet)]" />
            <h3 className="text-sm font-semibold tracking-tight">Suggested from recent captures</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">{suggestions.length}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            The AI noticed these patterns in your captures — turn them into a watch with one click.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {suggestions.map((s) =>
              s.suggested_kti_payload ? (
                <KtiSuggestionFromCapture
                  key={s.id}
                  signalId={s.id}
                  payload={s.suggested_kti_payload}
                />
              ) : null,
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Pile({
  tone,
  icon,
  label,
  count,
  empty,
  children,
}: {
  tone: "amber" | "iris" | "rose";
  icon: React.ReactNode;
  label: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
      : tone === "iris"
        ? "border-iris/30 bg-iris-soft/40 text-[color:var(--iris-violet)]"
        : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400";
  return (
    <Card className={cn("space-y-2 border p-3", toneCls)}>
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
          {icon}
          {label}
        </div>
        <span className="text-[11px] tabular-nums">{count}</span>
      </header>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-current/30 px-2 py-3 text-center text-[11px] opacity-70">
          {empty}
        </p>
      ) : (
        <ul className="space-y-1.5">{children}</ul>
      )}
    </Card>
  );
}

function PileItem({
  kti,
  latest,
  onScan,
  cta,
  ctaTo,
}: {
  kti: KtiRow;
  latest: ScanRow | undefined;
  onScan: () => void;
  cta: string;
  ctaTo: "/library/ktis/$id";
}) {
  return (
    <li className="rounded-lg border border-border/50 bg-card/80 p-2 text-xs text-foreground">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{kti.name}</div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {latest
              ? `last scan ${formatDistanceToNow(new Date(latest.scanned_at), { addSuffix: true })}`
              : "never scanned"}
            {" · "}
            {kti.scan_frequency}
          </div>
          {latest?.observed_value && (
            <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/90">
              {latest.observed_value}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[10px]"
            onClick={onScan}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Link
            to={ctaTo}
            params={{ id: kti.id }}
            className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background px-1.5 py-0.5 text-[10px] font-medium hover:border-iris/40"
          >
            {cta} <ArrowUpRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}
