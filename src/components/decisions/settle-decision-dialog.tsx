// Promotes an Open Decision into a real, logged Decision. The new decision
// row carries provenance (raised_from_kind = 'open_decision', raised_from_id),
// and the open decision is marked 'settled' with settled_decision_id pointing
// to the new row. Audit trail captures both writes via the generic CRUD trigger.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { sb } from "@/lib/sb";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface OpenDecisionLite {
  id: string;
  title: string;
  area: string;
  current_position: string | null;
}

interface SettleDecisionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  openDecision: OpenDecisionLite;
}

export function SettleDecisionDialog({ open, onOpenChange, openDecision }: SettleDecisionDialogProps) {
  const [decisionText, setDecisionText] = useState(openDecision.title);
  const [context, setContext] = useState(openDecision.current_position ?? "");
  const [implications, setImplications] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const mut = useMutation({
    mutationFn: async () => {
      // 1. Create the formal decision row, with provenance back to the open_decision.
      const { data: dec, error: dErr } = await sb
        .from("decisions")
        .insert({
          decision: decisionText.trim(),
          context: context.trim() || null,
          implications: implications.trim() || null,
          status: "decided",
          ocda_stage: "decide",
          date_made: new Date().toISOString().slice(0, 10),
          raised_from_kind: "open_decision",
          raised_from_id: openDecision.id,
          domain: openDecision.area || null,
        })
        .select("id")
        .single();
      if (dErr) throw dErr;
      // 2. Mark the open decision settled and link.
      const { error: oErr } = await sb
        .from("open_decisions")
        .update({ status: "settled", settled_decision_id: dec.id })
        .eq("id", openDecision.id);
      if (oErr) throw oErr;
      return dec.id as string;
    },
    onSuccess: (newId) => {
      toast.success("Decision logged · open decision settled");
      qc.invalidateQueries({ queryKey: ["open-decisions"] });
      qc.invalidateQueries({ queryKey: ["decisions"] });
      onOpenChange(false);
      navigate({ to: "/decisions/$id", params: { id: newId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settle this open decision</DialogTitle>
          <DialogDescription>
            Logs a formal decision and links it back. Both writes are audited.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="settle-decision">Decision</Label>
            <Input
              id="settle-decision"
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              placeholder="On {date} we decided X…"
            />
          </div>
          <div>
            <Label htmlFor="settle-context">Context / rationale</Label>
            <Textarea
              id="settle-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="Why this, why now."
            />
          </div>
          <div>
            <Label htmlFor="settle-implications">Implications (optional)</Label>
            <Textarea
              id="settle-implications"
              value={implications}
              onChange={(e) => setImplications(e.target.value)}
              rows={2}
              placeholder="What this changes downstream."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!decisionText.trim() || mut.isPending}
            className="gap-1.5"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Settle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
