import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Radar, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface SuggestedKtiPayload {
  name: string;
  description?: string;
  threshold_definition: string;
  scan_frequency?: "daily" | "weekly" | "monthly";
  trigger_action?: "task" | "bot_alert" | "flightdeck_flag" | "all";
  source_summary?: string;
}

interface Props {
  signalId: string;
  payload: SuggestedKtiPayload;
  /** Inline chip variant — small button. Default = card variant. */
  variant?: "chip" | "card";
}

/**
 * Renders an AI-suggested KTI from an inbound capture signal.
 * One click opens a pre-filled create sheet → confirm → it's now on your Watchlist.
 */
export function KtiSuggestionFromCapture({ signalId, payload, variant = "card" }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(payload.name ?? "");
  const [description, setDescription] = useState(payload.description ?? payload.source_summary ?? "");
  const [threshold, setThreshold] = useState(payload.threshold_definition ?? "");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(
    payload.scan_frequency ?? "weekly",
  );
  const [trigger, setTrigger] = useState<"task" | "bot_alert" | "flightdeck_flag" | "all">(
    payload.trigger_action ?? "bot_alert",
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !threshold.trim())
        throw new Error("Name and threshold are required");
      const { data, error } = await sb
        .from("key_trend_indicators")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          threshold_definition: threshold.trim(),
          scan_frequency: frequency,
          trigger_action: trigger,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Mark the signal as actioned so it disappears from the suggestion pile.
      await sb
        .from("inbound_signals")
        .update({ status: "routed", routed_to_kind: "kti", routed_to_id: (data as { id: string }).id } as never)
        .eq("id", signalId);
      return data as { id: string };
    },
    onSuccess: () => {
      toast.success("Now watching in SweetScan");
      qc.invalidateQueries({ queryKey: ["ktis"] });
      qc.invalidateQueries({ queryKey: ["sweetscan"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const Trigger =
    variant === "chip" ? (
      <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px]">
        <Radar className="h-3 w-3 text-[color:var(--iris-violet)]" /> Watch this in SweetScan
      </Button>
    ) : (
      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
        <Plus className="h-3 w-3" /> Add to Watchlist
      </Button>
    );

  const body = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Radar className="h-4 w-4 text-[color:var(--iris-violet)]" />
            Watch this signal in SweetScan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Name
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              What we're watching for
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Threshold — when does this fire?
            </Label>
            <Textarea
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Cadence
              </Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                On fire
              </Label>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as typeof trigger)}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bot_alert">Bot alert</SelectItem>
                  <SelectItem value="task">Spawn task</SelectItem>
                  <SelectItem value="flightdeck_flag">Flightdeck flag</SelectItem>
                  <SelectItem value="all">All three</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending} className="gap-1.5">
            {create.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Add to Watchlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (variant === "chip") return body;

  return (
    <Card className="space-y-2 border-iris/30 bg-iris-soft/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--iris-violet)]">
            <Radar className="h-3 w-3" />
            Suggested watch from a capture
          </div>
          <div className="mt-1 truncate text-sm font-medium">{payload.name}</div>
          {payload.threshold_definition && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              Fires when: {payload.threshold_definition}
            </p>
          )}
        </div>
        {body}
      </div>
    </Card>
  );
}
