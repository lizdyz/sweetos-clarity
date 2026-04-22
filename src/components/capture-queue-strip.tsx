import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Inbox, Check, X, Pause, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";
import { toast } from "sonner";

interface ProposalRow {
  id: string;
  entity_type: string;
  payload: Record<string, unknown> | null;
  confidence: number | null;
  status: string;
  created_at: string;
  source: string | null;
}

/**
 * Live strip of the most recent pending proposals, rendered directly under the
 * Capture composer so users can approve / reject / hold without navigating.
 */
export function CaptureQueueStrip() {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["capture-queue-strip"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("proposals")
        .select("id, entity_type, payload, confidence, status, created_at, source")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ProposalRow[];
    },
    staleTime: 5_000,
  });

  // Realtime — refresh strip when a new proposal arrives.
  useEffect(() => {
    const channel = sb
      .channel("proposals-strip")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "proposals" },
        () => qc.invalidateQueries({ queryKey: ["capture-queue-strip"] }),
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [qc]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "held" }) => {
      const { error } = await sb.from("proposals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Proposal ${v.status}`);
      qc.invalidateQueries({ queryKey: ["capture-queue-strip"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="panel-raised mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-[color:var(--iris-violet)]" />
          <h2 className="text-sm font-semibold tracking-tight">Live Proposals</h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Approve here — no extra screen needed
          </span>
        </div>
        <Link to="/queue" className="text-xs font-medium text-[color:var(--iris-violet)] hover:underline">
          Open full queue →
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading proposals…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          Nothing pending. Capture above and proposals appear here in realtime.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((p) => {
            const title = readTitle(p.payload) ?? "(untitled)";
            return (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs"
              >
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {p.entity_type}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                {typeof p.confidence === "number" && (
                  <span className="text-[10px] text-muted-foreground">
                    {(p.confidence * 100).toFixed(0)}%
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5"
                  title="Approve"
                  onClick={() => setStatus.mutate({ id: p.id, status: "approved" })}
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5"
                  title="Hold"
                  onClick={() => setStatus.mutate({ id: p.id, status: "held" })}
                >
                  <Pause className="h-3.5 w-3.5 text-amber-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5"
                  title="Reject"
                  onClick={() => setStatus.mutate({ id: p.id, status: "rejected" })}
                >
                  <X className="h-3.5 w-3.5 text-rose-600" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function readTitle(payload: Record<string, unknown> | null): string | undefined {
  if (!payload) return undefined;
  for (const k of ["name", "title", "campaign_name", "task", "task_or_responsibility", "decision"]) {
    const v = payload[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  if (typeof payload.text === "string") return (payload.text as string).slice(0, 80);
  return undefined;
}
