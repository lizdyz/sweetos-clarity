// Slide-in create sheet for a new Task.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
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
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASK_STATUS } from "@/lib/enums";
import { EntityKindHelper } from "@/components/entity-kind-helper";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill project context. */
  projectId?: string | null;
  /** Pre-fill relationship context. */
  relationshipId?: string | null;
}

interface OpMin { id: string; display_name: string | null; }
interface RelMin { id: string; name: string; }
interface ProjMin { id: string; name: string; }

export function TaskCreateSheet({ open, onOpenChange, projectId, relationshipId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("Not Started");
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [opPickerOpen, setOpPickerOpen] = useState(false);
  const [relId, setRelId] = useState<string | null>(relationshipId ?? null);
  const [relPickerOpen, setRelPickerOpen] = useState(false);
  const [projId, setProjId] = useState<string | null>(projectId ?? null);
  const [projPickerOpen, setProjPickerOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [createAnother, setCreateAnother] = useState(false);

  const { data: ops = [] } = useQuery<OpMin[]>({
    queryKey: ["operators-min-create"],
    queryFn: async () => {
      const { data, error } = await sb.from("operators").select("id, display_name").order("display_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: rels = [] } = useQuery<RelMin[]>({
    queryKey: ["relationships-min-create"],
    queryFn: async () => {
      const { data, error } = await sb.from("relationships").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: projs = [] } = useQuery<ProjMin[]>({
    queryKey: ["projects-min-create"],
    queryFn: async () => {
      const { data, error } = await sb.from("projects").select("id, name").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const reset = () => {
    setName("");
    setDescription("");
    setStatus("Not Started");
    setOperatorId(null);
    setRelId(relationshipId ?? null);
    setProjId(projectId ?? null);
    setDueDate(undefined);
  };

  const selectedOp = ops.find((o) => o.id === operatorId);
  const selectedRel = rels.find((r) => r.id === relId);
  const selectedProj = projs.find((p) => p.id === projId);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await sb
        .from("tasks")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          status,
          operator_id: operatorId,
          relationship_id: relId,
          project_id: projId,
          due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (row) => {
      toast.success("Task created");
      qc.invalidateQueries({ queryKey: ["tasks-index"] });
      qc.invalidateQueries({ queryKey: ["projects-rollup"] });
      if (createAnother) {
        reset();
      } else {
        onOpenChange(false);
        reset();
        navigate({ to: "/tasks/$id", params: { id: row.id } });
      }
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            New task <EntityKindHelper kind="task" />
          </SheetTitle>
          <SheetDescription>
            A unit of work. Assign an operator and a due date to make it actionable.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Title</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What needs to happen?"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Operator</Label>
            <Popover open={opPickerOpen} onOpenChange={setOpPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !selectedOp && "text-muted-foreground")}>
                  {selectedOp?.display_name ?? "Unassigned"}
                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search operators…" />
                  <CommandList>
                    <CommandEmpty>No matches.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="__none__" onSelect={() => { setOperatorId(null); setOpPickerOpen(false); }}>
                        <Check className={cn("mr-2 h-3.5 w-3.5", !operatorId ? "opacity-100" : "opacity-0")} />
                        <span className="text-muted-foreground">Unassigned</span>
                      </CommandItem>
                      {ops.map((o) => (
                        <CommandItem key={o.id} value={o.display_name ?? ""} onSelect={() => { setOperatorId(o.id); setOpPickerOpen(false); }}>
                          <Check className={cn("mr-2 h-3.5 w-3.5", operatorId === o.id ? "opacity-100" : "opacity-0")} />
                          {o.display_name ?? "—"}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Project (optional)</Label>
            <Popover open={projPickerOpen} onOpenChange={setProjPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !selectedProj && "text-muted-foreground")}>
                  {selectedProj?.name ?? "No project"}
                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search projects…" />
                  <CommandList>
                    <CommandEmpty>No matches.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="__none__" onSelect={() => { setProjId(null); setProjPickerOpen(false); }}>
                        <Check className={cn("mr-2 h-3.5 w-3.5", !projId ? "opacity-100" : "opacity-0")} />
                        <span className="text-muted-foreground">No project</span>
                      </CommandItem>
                      {projs.map((p) => (
                        <CommandItem key={p.id} value={p.name} onSelect={() => { setProjId(p.id); setProjPickerOpen(false); }}>
                          <Check className={cn("mr-2 h-3.5 w-3.5", projId === p.id ? "opacity-100" : "opacity-0")} />
                          {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Relationship (optional)</Label>
            <Popover open={relPickerOpen} onOpenChange={setRelPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !selectedRel && "text-muted-foreground")}>
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
                      <CommandItem value="__none__" onSelect={() => { setRelId(null); setRelPickerOpen(false); }}>
                        <Check className={cn("mr-2 h-3.5 w-3.5", !relId ? "opacity-100" : "opacity-0")} />
                        <span className="text-muted-foreground">No relationship</span>
                      </CommandItem>
                      {rels.map((r) => (
                        <CommandItem key={r.id} value={r.name} onSelect={() => { setRelId(r.id); setRelPickerOpen(false); }}>
                          <Check className={cn("mr-2 h-3.5 w-3.5", relId === r.id ? "opacity-100" : "opacity-0")} />
                          {r.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            {createMutation.isPending ? "Creating…" : "Create task"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
