import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Target, Plus, X } from "lucide-react";
import { sb } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

type Subject = "task" | "project" | "campaign";

const TABLE: Record<Subject, "task_jtbds" | "project_jtbds" | "campaign_jtbds"> = {
  task: "task_jtbds",
  project: "project_jtbds",
  campaign: "campaign_jtbds",
};

const FK: Record<Subject, "task_id" | "project_id" | "campaign_id"> = {
  task: "task_id",
  project: "project_id",
  campaign: "campaign_id",
};

interface Props {
  subject: Subject;
  subjectId: string;
}

interface JTBDLite {
  id: string;
  statement: string;
}

export function JTBDChips({ subject, subjectId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const fk = FK[subject];
  const table = TABLE[subject];
  const cacheKey = ["jtbd-chips", subject, subjectId];

  const { data: linked = [] } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      const { data, error } = await sb
        .from(table)
        .select(`jtbd_id, jobs_to_be_done!inner(id, statement)`)
        .eq(fk, subjectId);
      if (error) throw error;
      return ((data ?? []) as Array<{ jobs_to_be_done: JTBDLite }>).map(
        (r) => r.jobs_to_be_done,
      );
    },
  });

  const { data: all = [] } = useQuery({
    queryKey: ["jtbd-all-lite"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("jobs_to_be_done")
        .select("id, statement")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as JTBDLite[];
    },
    enabled: open,
  });

  const linkedIds = new Set(linked.map((j) => j.id));

  const add = useMutation({
    mutationFn: async (jtbdId: string) => {
      const { error } = await sb.from(table).insert({ [fk]: subjectId, jtbd_id: jtbdId } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cacheKey });
      toast.success("Linked JTBD");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (jtbdId: string) => {
      const { error } = await sb.from(table).delete().eq(fk, subjectId).eq("jtbd_id", jtbdId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cacheKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Target className="h-3 w-3" />
        Jobs-to-be-done this advances
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {linked.map((j) => (
          <Badge key={j.id} variant="outline" className="gap-1 pr-1">
            <Link
              to="/library/jtbd/$id"
              params={{ id: j.id }}
              className="hover:underline"
            >
              {j.statement.length > 50 ? j.statement.slice(0, 50) + "…" : j.statement}
            </Link>
            <button
              onClick={() => remove.mutate(j.id)}
              className="ml-0.5 rounded-sm p-0.5 hover:bg-muted"
              aria-label="Unlink"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[11px]">
              <Plus className="h-3 w-3" />
              Link JTBD
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search JTBDs…" />
              <CommandList>
                <CommandEmpty>No JTBDs found.</CommandEmpty>
                <CommandGroup>
                  {all
                    .filter((j) => !linkedIds.has(j.id))
                    .map((j) => (
                      <CommandItem
                        key={j.id}
                        value={j.statement}
                        onSelect={() => {
                          add.mutate(j.id);
                          setOpen(false);
                        }}
                      >
                        {j.statement}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
