import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bot, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { sb } from "@/lib/sb";
import { toast } from "sonner";

type CuratorKind = "domain" | "tenet" | "lens";

interface Props {
  kind: CuratorKind;
  subjectId: string;
  subjectLabel?: string;
}

const TABLE: Record<CuratorKind, string> = {
  domain: "domain_curators",
  tenet: "tenet_curators",
  lens: "lens_curators",
};
const FK: Record<CuratorKind, string> = {
  domain: "domain_id",
  tenet: "tenet_id",
  lens: "lens_id",
};

interface CuratorRow {
  id: string;
  operator_id: string;
  role: string;
  operators?: { id: string; name: string; kind: string } | null;
}

interface Operator {
  id: string;
  name: string;
  kind: string;
}

/**
 * Curator assignment panel for Domains, Tenets, and Lenses.
 * Lets users attach Operators (humans, workflows, agents) as curators / researchers / reviewers
 * who own keeping that subject's content fresh.
 */
export function CuratorPanel({ kind, subjectId, subjectLabel }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: curators = [] } = useQuery({
    queryKey: ["curators", kind, subjectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from(TABLE[kind])
        .select(`id, operator_id, role, operators (id, name, kind)`)
        .eq(FK[kind], subjectId);
      if (error) throw error;
      return (data ?? []) as CuratorRow[];
    },
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["operators-pool"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operators")
        .select("id, name, kind")
        .eq("enabled", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Operator[];
    },
  });

  const add = useMutation({
    mutationFn: async (operatorId: string) => {
      const { error } = await sb.from(TABLE[kind]).insert({
        [FK[kind]]: subjectId,
        operator_id: operatorId,
        role: "curator",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Curator added");
      qc.invalidateQueries({ queryKey: ["curators", kind, subjectId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await sb.from(TABLE[kind]).delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["curators", kind, subjectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignedIds = new Set(curators.map((c) => c.operator_id));
  const available = operators.filter((o) => !assignedIds.has(o.id));

  return (
    <Card className="panel-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Curators
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Operators who keep {subjectLabel ?? `this ${kind}`} fresh — agents propose, humans confirm.
          </p>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <Command>
              <CommandInput placeholder="Find operator…" />
              <CommandList>
                <CommandEmpty>No operators available.</CommandEmpty>
                <CommandGroup>
                  {available.map((op) => (
                    <CommandItem key={op.id} value={op.name} onSelect={() => add.mutate(op.id)}>
                      <Bot className="mr-2 h-3 w-3 text-muted-foreground" />
                      <span className="flex-1">{op.name}</span>
                      <Badge variant="outline" className="h-4 text-[9px]">
                        {op.kind}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {curators.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
          No curators yet.
        </div>
      ) : (
        <ul className="space-y-1">
          {curators.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-surface px-2 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <Bot className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{c.operators?.name ?? "Unknown"}</span>
                <Badge variant="outline" className="h-4 text-[9px]">
                  {c.role}
                </Badge>
                {c.operators?.kind && (
                  <span className="text-[10px] text-muted-foreground">· {c.operators.kind}</span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove.mutate(c.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
