import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Radar, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CanonGuardrail } from "@/components/canon-guardrail";
import { TimeControls } from "@/components/time-controls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/library/ktis/$id")({
  component: KtiDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Could not load KTI: {error.message}</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Retry
        </Button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">KTI not found.</p>
      <Link to="/library/ktis" className="text-xs text-[color:var(--iris-violet)]">
        ← All KTIs
      </Link>
    </div>
  ),
});

interface KtiDetailRow {
  id: string;
  name: string;
  description: string | null;
  threshold_definition: string;
  status: "active" | "paused" | "fired";
  trigger_action: string;
  scan_frequency: string;
  created_at: string;
  updated_at: string;
  domain: { name: string; slug: string } | null;
  relationship: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
}

interface ScanRow {
  id: string;
  scanned_at: string;
  observed_value: string | null;
  direction: "up" | "down" | "flat" | "fired" | "unknown";
  fired: boolean;
  notes: string | null;
}

const DIRECTION_GLYPH: Record<ScanRow["direction"], string> = {
  up: "↑",
  down: "↓",
  flat: "→",
  fired: "🔥",
  unknown: "·",
};

function KtiDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: kti, isLoading } = useQuery({
    queryKey: ["kti", id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("key_trend_indicators")
        .select(
          "id, name, description, threshold_definition, status, trigger_action, scan_frequency, created_at, updated_at, domain:domains(name, slug), relationship:relationships(id, name), owner:operators(id, name)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as KtiDetailRow | null;
    },
  });

  const { data: scans = [] } = useQuery({
    queryKey: ["kti_scans", id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("kti_scans")
        .select("id, scanned_at, observed_value, direction, fired, notes")
        .eq("kti_id", id)
        .order("scanned_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ScanRow[];
    },
  });

  const scan = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("scan-signals", {
        body: { mode: "kti", kti_id: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Scan complete");
      qc.invalidateQueries({ queryKey: ["kti", id] });
      qc.invalidateQueries({ queryKey: ["kti_scans", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!kti) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">KTI not found.</p>
        <Link to="/library/ktis" className="text-xs text-[color:var(--iris-violet)]">
          ← All KTIs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-6 py-6">
      <Link
        to="/library/ktis"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All KTIs
      </Link>

      <header className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-iris-soft/60 to-iris/30 text-[color:var(--iris-violet)] shadow-[var(--shadow-glass)]">
          <Radar className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{kti.name}</h1>
          {kti.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{kti.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {kti.domain && (
              <Link
                to="/domains/$slug"
                params={{ slug: kti.domain.slug }}
                className="rounded-full bg-muted/40 px-2 py-0.5 hover:text-foreground"
              >
                {kti.domain.name}
              </Link>
            )}
            {kti.relationship && (
              <Link
                to="/relationships/$id"
                params={{ id: kti.relationship.id }}
                className="rounded-full bg-iris-soft/30 px-2 py-0.5 text-[color:var(--iris-violet)] hover:underline"
              >
                {kti.relationship.name}
              </Link>
            )}
            {kti.owner && (
              <span className="rounded-full bg-muted/40 px-2 py-0.5">{kti.owner.name}</span>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5",
                kti.status === "fired" && "bg-amber-500/15 text-amber-500",
                kti.status === "active" && "bg-emerald-500/15 text-emerald-600",
                kti.status === "paused" && "bg-muted/40 text-muted-foreground",
              )}
            >
              {kti.status}
            </span>
            <span className="rounded-full bg-muted/40 px-2 py-0.5">{kti.scan_frequency}</span>
            <span className="rounded-full bg-muted/40 px-2 py-0.5">{kti.trigger_action}</span>
          </div>
        </div>
        <Button onClick={() => scan.mutate()} disabled={scan.isPending} size="sm" className="gap-1.5">
          {scan.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Run scan now
        </Button>
      </header>

      <CanonGuardrail entityKind="kti" />

      <Card className="panel-raised p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Threshold
        </h3>
        <p className="mt-1 text-sm">{kti.threshold_definition}</p>
      </Card>

      <TimeControls
        table="key_trend_indicators"
        rowId={kti.id}
        invalidateKeys={[["kti", id]]}
        createdAt={kti.created_at}
        showRecurrence={false}
      />

      <Card className="panel-raised p-4">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Scan history</h3>
        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr className="text-left">
                <th className="pb-2 font-medium">When</th>
                <th className="pb-2 font-medium">Dir</th>
                <th className="pb-2 font-medium">Observed</th>
                <th className="pb-2 font-medium">Fired</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {scans.map((s) => (
                <tr key={s.id}>
                  <td className="py-1.5 text-xs text-muted-foreground">
                    {new Date(s.scanned_at).toLocaleString()}
                  </td>
                  <td className="py-1.5 text-base">{DIRECTION_GLYPH[s.direction]}</td>
                  <td className="py-1.5 text-xs">{s.observed_value ?? s.notes ?? "—"}</td>
                  <td className="py-1.5 text-xs">{s.fired ? "🔥" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
