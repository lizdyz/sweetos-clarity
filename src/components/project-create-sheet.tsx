// Slide-in create sheet for a new Project.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS, PROJECT_PRIORITY } from "@/lib/enums";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RelMin {
  id: string;
  name: string;
}

export function ProjectCreateSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("Active");
  const [priority, setPriority] = useState<string>("🟢 Normal");
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [relPickerOpen, setRelPickerOpen] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  const { data: rels = [] } = useQuery<RelMin[]>({
    queryKey: ["relationships-min-create"],
    queryFn: async () => {
      const { data, error } = await sb.from("relationships").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const reset = () => {
    setName("");
    setNotes("");
    setStatus("Active");
    setPriority("🟢 Normal");
    setRelationshipId(null);
  };

  const selectedRel = rels.find((r) => r.id === relationshipId);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await sb
        .from("projects")
        .insert({
          name: name.trim(),
          notes: notes.trim() || null,
          status,
          priority,
          relationship_id: relationshipId,
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (row) => {
      toast.success("Project created");
      qc.invalidateQueries({ queryKey: ["projects-index"] });
      qc.invalidateQueries({ queryKey: ["projects-rollup"] });
      if (createAnother) {
        reset();
      } else {
        onOpenChange(false);
        reset();
        navigate({ to: "/projects/$id", params: { id: row.id } });
      }
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New project</SheetTitle>
          <SheetDescription>
            Group related work. Tasks, decisions, and components attach here.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Onboarding revamp"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Relationship (optional)</Label>
            <Popover open={relPickerOpen} onOpenChange={setRelPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn("w-full justify-between font-normal", !selectedRel && "text-muted-foreground")}
                >
                  {selectedRel?.name ?? "No relationship"}
                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search relationships…" />
                  <CommandList>
                    <CommandEmpty>No matches.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={() => {
                          setRelationshipId(null);
                          setRelPickerOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-3.5 w-3.5", !relationshipId ? "opacity-100" : "opacity-0")} />
                        <span className="text-muted-foreground">No relationship</span>
                      </CommandItem>
                      {rels.map((r) => (
                        <CommandItem
                          key={r.id}
                          value={r.name}
                          onSelect={() => {
                            setRelationshipId(r.id);
                            setRelPickerOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-3.5 w-3.5", relationshipId === r.id ? "opacity-100" : "opacity-0")} />
                          {r.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_PRIORITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Label htmlFor="another" className="text-xs text-muted-foreground">Create another after save</Label>
            <Switch id="another" checked={createAnother} onCheckedChange={setCreateAnother} />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create project"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
