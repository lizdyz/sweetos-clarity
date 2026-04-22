import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Plus, Sparkles, FolderKanban, ListTodo, Box, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type EntityKind = "tasks" | "projects" | "components" | "sessions";

interface RowMeta {
  table: EntityKind;
  column: string; // operator FK column on the table
  label: string;
  singular: string;
  to: "/tasks/$id" | "/projects/$id" | "/components/$id" | "/sessions/$id";
  icon: typeof ListTodo;
  /** Columns to select for the assigned-rows list (must include id). */
  listSelect: string;
  /** Columns to select for tag-overlap matching when computing suggestions. */
  tagColumns: string[];
}

const ROW_META: Record<EntityKind, RowMeta> = {
  tasks: {
    table: "tasks",
    column: "operator_id",
    label: "Tasks",
    singular: "task",
    to: "/tasks/$id",
    icon: ListTodo,
    listSelect: "id, name, status, due_date, blocked, tagged_domains, tagged_tenets, tagged_components",
    tagColumns: ["tagged_domains", "tagged_tenets", "tagged_components"],
  },
  projects: {
    table: "projects",
    column: "operator_id",
    label: "Projects",
    singular: "project",
    to: "/projects/$id",
    icon: FolderKanban,
    listSelect: "id, name, status, deadline, tagged_domains, tagged_tenets",
    tagColumns: ["tagged_domains", "tagged_tenets"],
  },
  components: {
    table: "components",
    column: "responsible_operator_id",
    label: "Components",
    singular: "component",
    to: "/components/$id",
    icon: Box,
    listSelect: "id, name, current_maturity_level, related_domains, related_tenets",
    tagColumns: ["related_domains", "related_tenets"],
  },
  sessions: {
    table: "sessions",
    column: "operator_id",
    label: "Sessions",
    singular: "session",
    to: "/sessions/$id",
    icon: Calendar,
    listSelect: "id, name, scheduled_for, sweetcycle_phase, tagged_components",
    tagColumns: ["tagged_components"],
  },
};

interface AssignedRow {
  id: string;
  name: string | null;
  status?: string | null;
  due_date?: string | null;
  deadline?: string | null;
  scheduled_for?: string | null;
  current_maturity_level?: string | null;
  sweetcycle_phase?: string | null;
}

interface Operator {
  id: string;
  name: string;
  skills: string[];
}

export function OperatorAssignmentsPanel({ operatorId }: { operatorId: string }) {
  const [tab, setTab] = useState<EntityKind>("tasks");

  const { data: operator } = useQuery<Operator | null>({
    queryKey: ["operator-assignments", "self", operatorId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operators")
        .select("id, name, skills")
        .eq("id", operatorId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Operator | null;
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Assignments</h2>
          <p className="text-[11px] text-muted-foreground">
            Work this operator owns, leads, or facilitates.
          </p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as EntityKind)}>
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(ROW_META) as EntityKind[]).map((k) => {
            const meta = ROW_META[k];
            const Icon = meta.icon;
            return (
              <TabsTrigger key={k} value={k} className="text-xs">
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                <CountedLabel kind={k} operatorId={operatorId} label={meta.label} />
              </TabsTrigger>
            );
          })}
        </TabsList>
        {(Object.keys(ROW_META) as EntityKind[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-4 space-y-3">
            <SuggestionStrip
              kind={k}
              operatorId={operatorId}
              operatorSkills={operator?.skills ?? []}
              operatorName={operator?.name ?? "operator"}
            />
            <AssignedList kind={k} operatorId={operatorId} />
            <AssignExistingButton kind={k} operatorId={operatorId} />
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}

function CountedLabel({ kind, operatorId, label }: { kind: EntityKind; operatorId: string; label: string }) {
  const meta = ROW_META[kind];
  const { data } = useQuery<number>({
    queryKey: ["operator-assignment-count", kind, operatorId],
    queryFn: async () => {
      const { count, error } = await sb
        .from(meta.table)
        .select("id", { head: true, count: "exact" })
        .eq(meta.column, operatorId);
      if (error) throw error;
      return count ?? 0;
    },
  });
  return (
    <span>
      {label}{" "}
      {typeof data === "number" && (
        <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{data}</span>
      )}
    </span>
  );
}

function AssignedList({ kind, operatorId }: { kind: EntityKind; operatorId: string }) {
  const meta = ROW_META[kind];
  const { data: rows = [], isLoading } = useQuery<AssignedRow[]>({
    queryKey: ["operator-assignments", kind, operatorId],
    queryFn: async () => {
      const { data, error } = await sb
        .from(meta.table)
        .select(meta.listSelect)
        .eq(meta.column, operatorId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AssignedRow[];
    },
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        No {meta.label.toLowerCase()} assigned yet. Use the suggestions above or "Assign existing" below.
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            to={meta.to}
            params={{ id: r.id }}
            className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-2 text-xs hover:bg-muted/40"
          >
            <span className="truncate font-medium">{r.name ?? "Untitled"}</span>
            <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{summarizeRow(kind, r)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function summarizeRow(kind: EntityKind, r: AssignedRow): string {
  if (kind === "tasks") return [r.status ?? "—", r.due_date].filter(Boolean).join(" · ");
  if (kind === "projects") return [r.status ?? "—", r.deadline].filter(Boolean).join(" · ");
  if (kind === "components") return r.current_maturity_level ?? "—";
  if (kind === "sessions") return [r.sweetcycle_phase ?? "—", r.scheduled_for].filter(Boolean).join(" · ");
  return "";
}

function SuggestionStrip({
  kind,
  operatorId,
  operatorSkills,
  operatorName,
}: {
  kind: EntityKind;
  operatorId: string;
  operatorSkills: string[];
  operatorName: string;
}) {
  const meta = ROW_META[kind];
  const qc = useQueryClient();

  const { data: suggestions = [] } = useQuery<AssignedRow[]>({
    queryKey: ["operator-suggestions", kind, operatorId, operatorSkills.join(",")],
    enabled: operatorSkills.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from(meta.table)
        .select(meta.listSelect)
        .is(meta.column, null)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const list = (data ?? []) as Array<AssignedRow & Record<string, unknown>>;
      const skillsLower = operatorSkills.map((s) => s.toLowerCase());
      const scored = list.map((r) => {
        let overlap = 0;
        for (const col of meta.tagColumns) {
          const tags = (r[col] as string[] | null) ?? [];
          for (const t of tags) {
            if (skillsLower.includes(String(t).toLowerCase())) overlap += 1;
          }
        }
        return { row: r, overlap };
      });
      return scored
        .filter((s) => s.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 3)
        .map((s) => s.row);
    },
  });

  const assign = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await sb
        .from(meta.table)
        .update({ [meta.column]: operatorId })
        .eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Assigned to ${operatorName}`);
      qc.invalidateQueries({ queryKey: ["operator-assignments", kind, operatorId] });
      qc.invalidateQueries({ queryKey: ["operator-assignment-count", kind, operatorId] });
      qc.invalidateQueries({ queryKey: ["operator-suggestions", kind, operatorId] });
      qc.invalidateQueries({ queryKey: ["operator-workload"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (operatorSkills.length === 0 || suggestions.length === 0) return null;

  return (
    <div className="rounded-lg border border-iris/30 bg-iris/5 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--iris-violet)]">
        <Sparkles className="h-3 w-3" />
        Suggested for {operatorName}
      </div>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-2 rounded-md bg-background/80 p-2 text-xs"
          >
            <Link
              to={meta.to}
              params={{ id: s.id }}
              className="min-w-0 flex-1 truncate font-medium hover:underline"
            >
              {s.name ?? "Untitled"}
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              onClick={() => assign.mutate(s.id)}
              disabled={assign.isPending}
            >
              Assign
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignExistingButton({ kind, operatorId }: { kind: EntityKind; operatorId: string }) {
  const meta = ROW_META[kind];
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: candidates = [] } = useQuery<AssignedRow[]>({
    queryKey: ["operator-assignable", kind],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await sb
        .from(meta.table)
        .select("id, name")
        .is(meta.column, null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AssignedRow[];
    },
  });

  const assign = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await sb
        .from(meta.table)
        .update({ [meta.column]: operatorId })
        .eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assigned");
      qc.invalidateQueries({ queryKey: ["operator-assignments", kind, operatorId] });
      qc.invalidateQueries({ queryKey: ["operator-assignment-count", kind, operatorId] });
      qc.invalidateQueries({ queryKey: ["operator-assignable", kind] });
      qc.invalidateQueries({ queryKey: ["operator-suggestions", kind, operatorId] });
      qc.invalidateQueries({ queryKey: ["operator-workload"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex justify-end">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 text-[11px]">
            <Plus className="mr-1 h-3 w-3" /> Assign existing {meta.singular}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="end">
          <Command>
            <CommandInput placeholder={`Search unassigned ${meta.label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>No unassigned {meta.label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                {candidates.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name ?? c.id}
                    onSelect={() => assign.mutate(c.id)}
                  >
                    <span className="truncate">{c.name ?? "Untitled"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const _ = cn;
export type { Badge as _Badge };
