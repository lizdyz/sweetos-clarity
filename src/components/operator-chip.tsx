import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sb } from "@/lib/sb";
import { Bot, User, Workflow as WorkflowIcon, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
import { Link } from "@tanstack/react-router";

const KIND_ICON = {
  human: User,
  workflow: WorkflowIcon,
  agent: Bot,
} as const;

const KIND_TONE: Record<string, string> = {
  human: "text-emerald-700 dark:text-emerald-400",
  workflow: "text-[color:var(--iris-violet)]",
  agent: "text-amber-700 dark:text-amber-400",
};

interface OperatorRow {
  id: string;
  name: string;
  kind: "human" | "workflow" | "agent";
  availability: string;
}

interface Props {
  /** Table to update — e.g. "tasks", "projects", "sessions", "components". */
  table: string;
  /** PK of the row to update. */
  rowId: string;
  /** Column on that table that holds the operator id. */
  column: string;
  /** Current operator id (or null/undefined). */
  operatorId: string | null | undefined;
  /** Query keys to invalidate after a successful update. */
  invalidateKeys?: unknown[][];
  /** Short label, e.g. "Owner", "Assignee", "Facilitator". */
  label?: string;
}

/**
 * Compact inline operator picker.
 * Shows current operator (or "Unassigned") and opens a searchable popover to reassign.
 */
export function OperatorChip({
  table,
  rowId,
  column,
  operatorId,
  invalidateKeys = [],
  label = "Operator",
}: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: operators = [] } = useQuery<OperatorRow[]>({
    queryKey: ["operators", "picker"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operators")
        .select("id, name, kind, availability")
        .eq("enabled", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as OperatorRow[];
    },
  });

  const current = operators.find((o) => o.id === operatorId) ?? null;
  const Icon = current ? KIND_ICON[current.kind] : UserPlus;

  const update = useMutation({
    mutationFn: async (nextId: string | null) => {
      const { error } = await sb.from(table).update({ [column]: nextId }).eq("id", rowId);
      if (error) throw error;
      return nextId;
    },
    onSuccess: (nextId) => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: ["operator-workload"] });
      toast.success(nextId ? "Operator assigned" : "Operator cleared");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
              current
                ? "border-border/60 bg-muted/40 hover:border-iris/40 hover:bg-muted/60"
                : "border-dashed border-border text-muted-foreground hover:border-iris/40 hover:text-foreground",
            )}
          >
            <Icon className={cn("h-3 w-3", current ? KIND_TONE[current.kind] : "")} />
            {current ? current.name : "Unassigned"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search operators…" />
            <CommandList>
              <CommandEmpty>No operators found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__unassigned__"
                  onSelect={() => update.mutate(null)}
                  className="text-muted-foreground"
                >
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  Unassigned
                </CommandItem>
                {operators.map((o) => {
                  const ItemIcon = KIND_ICON[o.kind];
                  return (
                    <CommandItem
                      key={o.id}
                      value={`${o.name} ${o.kind}`}
                      onSelect={() => update.mutate(o.id)}
                    >
                      <ItemIcon className={cn("mr-2 h-3.5 w-3.5", KIND_TONE[o.kind])} />
                      <span className="flex-1">{o.name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{o.availability}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {current && (
        <Link
          to="/operators/$id"
          params={{ id: current.id }}
          className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
        >
          open
        </Link>
      )}
    </div>
  );
}
