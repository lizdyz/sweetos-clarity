// Slide-in create sheet for a new Relationship.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RELATIONSHIP_TYPES, PIPELINE_STAGE } from "@/lib/enums";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RelationshipCreateSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState<string>("Prospect");
  const [stage, setStage] = useState<string>("1. Awareness");
  const [notes, setNotes] = useState("");
  const [createAnother, setCreateAnother] = useState(false);

  const reset = () => {
    setName("");
    setCompany("");
    setType("Prospect");
    setStage("1. Awareness");
    setNotes("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await sb
        .from("relationships")
        .insert({
          name: name.trim(),
          company: company.trim() || null,
          type,
          pipeline_stage: stage,
          notes: notes.trim() || null,
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (row) => {
      toast.success("Relationship added");
      qc.invalidateQueries({ queryKey: ["relationship-journey-index"] });
      if (createAnother) {
        reset();
      } else {
        onOpenChange(false);
        reset();
        navigate({ to: "/relationships/$id", params: { id: row.id } });
      }
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add relationship</SheetTitle>
          <SheetDescription>
            A person, prospect, client, partner, or vendor.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Lee"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org">Organization (optional)</Label>
            <Input
              id="org"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Acme Wealth Partners"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pipeline stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Where they came from, what they care about…"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Label htmlFor="another" className="text-xs text-muted-foreground">Add another after save</Label>
            <Switch id="another" checked={createAnother} onCheckedChange={setCreateAnother} />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Adding…" : "Add relationship"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
