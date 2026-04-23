// Slide-in create sheet for a new Component.
// Form-control canon: Toggle for kind (3-way), Select for maturity (5-way),
// Switch for "create another", Calendar popover not needed here.
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MATURITY_LEVEL } from "@/lib/enums";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Kind = "user" | "platform" | "internal";

export function ComponentCreateSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<Kind>("user");
  const [maturity, setMaturity] = useState<string>("L1 Lacking");
  const [createAnother, setCreateAnother] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setKind("user");
    setMaturity("L1 Lacking");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await sb
        .from("components")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          component_kind: kind,
          current_maturity_level: maturity,
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (row) => {
      toast.success("Component created");
      qc.invalidateQueries({ queryKey: ["components-list"] });
      qc.invalidateQueries({ queryKey: ["component-build-pipeline"] });
      if (createAnother) {
        reset();
      } else {
        onOpenChange(false);
        reset();
        navigate({ to: "/components/$id", params: { id: row.id } });
      }
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New component</SheetTitle>
          <SheetDescription>
            A reusable building block. Start at L1 — maturity advances through use.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Discovery Brief Template"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kind</Label>
            <ToggleGroup
              type="single"
              value={kind}
              onValueChange={(v) => v && setKind(v as Kind)}
              className="justify-start"
            >
              <ToggleGroupItem value="user" className="text-xs">User</ToggleGroupItem>
              <ToggleGroupItem value="platform" className="text-xs">Platform</ToggleGroupItem>
              <ToggleGroupItem value="internal" className="text-xs">Internal</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Maturity</Label>
            <Select value={maturity} onValueChange={setMaturity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATURITY_LEVEL.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this component do? Who uses it?"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Label htmlFor="another" className="text-xs text-muted-foreground">
              Create another after save
            </Label>
            <Switch id="another" checked={createAnother} onCheckedChange={setCreateAnother} />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create component"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
