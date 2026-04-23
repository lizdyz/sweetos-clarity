import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sb } from "@/lib/sb";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createHandoff } from "@/lib/handoffs";
import type { HandoffReason, HandoffSubjectKind } from "@/lib/handoffs";

const REASONS: { value: HandoffReason; label: string }[] = [
  { value: "ready_for_review", label: "Ready for review" },
  { value: "blocked", label: "Blocked — needs you" },
  { value: "escalation", label: "Escalation" },
  { value: "fyi", label: "FYI" },
  { value: "reassign", label: "Reassign" },
];

type Operator = { id: string; name: string; kind: string; availability: string };

interface HandoffSheetProps {
  subjectKind: HandoffSubjectKind;
  subjectId: string;
  subjectLabel?: string;
  fromOperatorId: string | null;
  defaultDueDate?: string | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HandoffSheet({
  subjectKind,
  subjectId,
  subjectLabel,
  fromOperatorId,
  defaultDueDate,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: HandoffSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [toOperatorId, setToOperatorId] = useState<string>("");
  const [reason, setReason] = useState<HandoffReason>("ready_for_review");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState<string>(defaultDueDate ?? "");

  const qc = useQueryClient();
  const createFn = useServerFn(createHandoff);

  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ["operators-list-for-handoff"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operators")
        .select("id, name, kind, availability")
        .eq("enabled", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Operator[];
    },
    enabled: open,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!toOperatorId) throw new Error("Pick a recipient");
      return createFn({
        data: {
          fromOperatorId,
          toOperatorId,
          subjectKind,
          subjectId,
          reason,
          note: note.trim() || null,
          dueDate: dueDate || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Handed off");
      qc.invalidateQueries({ queryKey: ["handoff-inbox"] });
      qc.invalidateQueries({ queryKey: ["operator-workload"] });
      qc.invalidateQueries({ queryKey: ["operator-queue"] });
      setOpen(false);
      setToOperatorId("");
      setNote("");
      setReason("ready_for_review");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fromName = fromOperatorId
    ? operators.find((o) => o.id === fromOperatorId)?.name ?? "you"
    : "you";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Hand off</SheetTitle>
          <SheetDescription className="text-xs">
            Route this {subjectKind.replace("_", " ")} to another operator. Creates an audit-trailed event.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
            <div className="mt-1 rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-sm">{fromName}</div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
            <Select value={toOperatorId} onValueChange={setToOperatorId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pick an operator…" /></SelectTrigger>
              <SelectContent>
                {operators
                  .filter((o) => o.id !== fromOperatorId)
                  .map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="capitalize text-[10px] text-muted-foreground mr-2">{o.kind}</span>
                      {o.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">What</Label>
            <div className="mt-1 rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground capitalize">{subjectKind.replace("_", " ")}: </span>
              {subjectLabel ?? subjectId.slice(0, 8)}
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Why</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as HandoffReason)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional context for the receiver…"
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={!toOperatorId || submit.isPending}>
            {submit.isPending ? "Handing off…" : "Hand off"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
