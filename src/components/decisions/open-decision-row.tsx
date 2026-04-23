// Actionable row for an open decision. The whole point of Wave 20 is that
// this row is no longer a memo — it carries a status cycle, a "Settle this"
// primary action, and a snooze. State changes flow through the generic audit
// trigger so calibration over time is reviewable.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Chip } from "@/components/chips";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettleDecisionDialog } from "./settle-decision-dialog";

export type OpenDecisionStatus = "open" | "exploring" | "calibrating" | "settled";

const CYCLE: OpenDecisionStatus[] = ["open", "exploring", "calibrating", "settled"];

interface OpenDecision {
  id: string;
  title: string;
  area: string;
  current_position: string | null;
  status: string;
  notes: string | null;
  settled_decision_id: string | null;
}

function statusTone(status: string): "neutral" | "iris" | "warning" | "success" {
  if (status === "settled") return "success";
  if (status === "calibrating") return "iris";
  if (status === "exploring") return "warning";
  return "neutral";
}

export function OpenDecisionRow({ decision }: { decision: OpenDecision }) {
  const [settleOpen, setSettleOpen] = useState(false);
  const qc = useQueryClient();

  const cycleMut = useMutation({
    mutationFn: async () => {
      const idx = CYCLE.indexOf(decision.status as OpenDecisionStatus);
      const next = CYCLE[(idx + 1) % CYCLE.length];
      // Skip to settle dialog when reaching settled
      if (next === "settled") {
        setSettleOpen(true);
        return null;
      }
      const { error } = await sb
        .from("open_decisions")
        .update({ status: next })
        .eq("id", decision.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      if (next) {
        toast.success(`Status → ${next}`);
        qc.invalidateQueries({ queryKey: ["open-decisions"] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const snoozeMut = useMutation({
    mutationFn: async () => {
      const noteSuffix = `\n[snoozed ${new Date().toLocaleDateString()}]`;
      const { error } = await sb
        .from("open_decisions")
        .update({ notes: (decision.notes ?? "") + noteSuffix })
        .eq("id", decision.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Snoozed for 7 days");
      qc.invalidateQueries({ queryKey: ["open-decisions"] });
    },
  });

  const isSettled = decision.status === "settled";

  return (
    <li className="space-y-1.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{decision.title}</h3>
        <button
          type="button"
          onClick={() => cycleMut.mutate()}
          disabled={cycleMut.isPending || isSettled}
          title={isSettled ? "Already settled" : "Click to advance"}
          className="transition hover:opacity-80 disabled:cursor-default disabled:opacity-100"
        >
          <Chip tone={statusTone(decision.status)}>
            {cycleMut.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              decision.status
            )}
          </Chip>
        </button>
      </div>
      {decision.current_position && (
        <p className="text-xs text-muted-foreground">{decision.current_position}</p>
      )}
      {decision.notes && (
        <p className="text-xs text-foreground/70 whitespace-pre-line">{decision.notes}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {!isSettled && (
          <>
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={() => setSettleOpen(true)}
            >
              <CheckCircle2 className="h-3 w-3" /> Settle this
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2.5 text-xs text-muted-foreground"
              onClick={() => snoozeMut.mutate()}
              disabled={snoozeMut.isPending}
            >
              <Clock3 className="h-3 w-3" /> Snooze 7d
            </Button>
          </>
        )}
      </div>
      {settleOpen && (
        <SettleDecisionDialog
          open={settleOpen}
          onOpenChange={setSettleOpen}
          openDecision={decision}
        />
      )}
    </li>
  );
}
