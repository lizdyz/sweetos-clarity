import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { Chip } from "@/components/chips";
import { Plus, X, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const Route = createFileRoute("/_app/tasks/$id")({
  component: TaskDetail,
});

const DONE_STATUSES = ["Done", "Complete", "Completed", "Cancelled", "Canceled", "Archived"];

function TaskDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <TaskPanels taskId={id} />
      <EntityDetailPage entityKey="tasks" />
    </div>
  );
}

function TaskPanels({ taskId }: { taskId: string }) {
  const qc = useQueryClient();

  const { data: task } = useQuery({
    queryKey: ["tasks", "panel", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status, owner, assignee_id, priority, due_date, blocked, waiting_on, project_id, relationship_id")
        .eq("id", taskId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: project } = useQuery({
    queryKey: ["projects", "ref", task?.project_id],
    enabled: !!task?.project_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("id", task!.project_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: relationship } = useQuery({
    queryKey: ["relationships", "ref", task?.relationship_id],
    enabled: !!task?.relationship_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationships")
        .select("id, name, company")
        .eq("id", task!.relationship_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: assignee } = useQuery({
    queryKey: ["profiles", "ref", task?.assignee_id],
    enabled: !!task?.assignee_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", task!.assignee_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Blocked-by (this task depends on these)
  const { data: blockedBy = [] } = useQuery({
    queryKey: ["task_deps", "blocked-by", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_dependencies")
        .select("id, depends_on_task_id, kind, depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, name, status)")
        .eq("task_id", taskId);
      if (error) {
        // Fallback if FK alias not registered
        const { data: d2, error: e2 } = await supabase
          .from("task_dependencies")
          .select("id, depends_on_task_id, kind")
          .eq("task_id", taskId);
        if (e2) throw e2;
        if (!d2 || d2.length === 0) return [];
        const ids = d2.map((r) => r.depends_on_task_id);
        const { data: tasksRows } = await supabase
          .from("tasks")
          .select("id, name, status")
          .in("id", ids);
        const m = new Map((tasksRows ?? []).map((t: any) => [t.id, t]));
        return d2.map((r) => ({ ...r, depends_on: m.get(r.depends_on_task_id) }));
      }
      return data ?? [];
    },
  });

  // Blocks (these tasks depend on this one)
  const { data: blocks = [] } = useQuery({
    queryKey: ["task_deps", "blocks", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_dependencies")
        .select("id, task_id, kind")
        .eq("depends_on_task_id", taskId);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const ids = data.map((r: any) => r.task_id);
      const { data: t2 } = await supabase
        .from("tasks")
        .select("id, name, status")
        .in("id", ids);
      const m = new Map((t2 ?? []).map((t: any) => [t.id, t]));
      return data.map((r: any) => ({ ...r, downstream: m.get(r.task_id) }));
    },
  });

  const addDep = useMutation({
    mutationFn: async ({ otherId, direction }: { otherId: string; direction: "blocks" | "blocked-by" }) => {
      const { data: u } = await supabase.auth.getUser();
      const row =
        direction === "blocked-by"
          ? { task_id: taskId, depends_on_task_id: otherId, kind: "blocks", created_by: u.user?.id }
          : { task_id: otherId, depends_on_task_id: taskId, kind: "blocks", created_by: u.user?.id };
      const { error } = await supabase.from("task_dependencies").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task_deps"] });
      qc.invalidateQueries({ queryKey: ["tasks", "panel", taskId] });
    },
  });

  const removeDep = useMutation({
    mutationFn: async (depId: string) => {
      const { error } = await supabase.from("task_dependencies").delete().eq("id", depId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task_deps"] });
      qc.invalidateQueries({ queryKey: ["tasks", "panel", taskId] });
    },
  });

  if (!task) return null;

  const statusTone = task.blocked
    ? "destructive"
    : DONE_STATUSES.includes(task.status ?? "")
      ? "success"
      : "iris";

  return (
    <div className="space-y-5 px-6 pt-5">
      {/* Header */}
      <section className="panel-raised p-5">
        <h1 className="text-xl font-semibold tracking-tight">{task.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Chip tone={statusTone}>{task.status ?? "Not started"}</Chip>
          {task.blocked && <Chip tone="destructive">Blocked</Chip>}
          {task.priority && <Chip tone="neutral">{task.priority}</Chip>}
          {task.due_date && (
            <span className="text-muted-foreground">
              Due {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {assignee && (
            <span className="text-muted-foreground">· Assignee: {assignee.display_name}</span>
          )}
          {!assignee && task.owner && (
            <span className="text-muted-foreground">· Owner: {task.owner}</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {project && (
            <Link
              to="/projects/$id"
              params={{ id: project.id }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:bg-iris-soft/40"
            >
              Project: {project.name} <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
          {relationship && (
            <Link
              to="/relationships/$id"
              params={{ id: relationship.id }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:bg-iris-soft/40"
            >
              Relationship: {relationship.name} <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </section>

      {/* Dependencies graph (1-hop) */}
      <section className="panel-raised p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Connections
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <DepColumn
            title="Blocked by"
            icon={<ArrowDownRight className="h-3.5 w-3.5" />}
            empty="Nothing blocking this task."
            items={(blockedBy as any[]).map((d) => ({
              depId: d.id,
              taskId: d.depends_on?.id,
              name: d.depends_on?.name,
              status: d.depends_on?.status,
            }))}
            onRemove={(depId) => removeDep.mutate(depId)}
            onAdd={(otherId) => addDep.mutate({ otherId, direction: "blocked-by" })}
            excludeIds={[taskId, ...(blockedBy as any[]).map((d) => d.depends_on_task_id)]}
          />
          <DepColumn
            title="Blocks"
            icon={<ArrowUpRight className="h-3.5 w-3.5" />}
            empty="Not blocking anything."
            items={(blocks as any[]).map((d) => ({
              depId: d.id,
              taskId: d.downstream?.id,
              name: d.downstream?.name,
              status: d.downstream?.status,
            }))}
            onRemove={(depId) => removeDep.mutate(depId)}
            onAdd={(otherId) => addDep.mutate({ otherId, direction: "blocks" })}
            excludeIds={[taskId, ...(blocks as any[]).map((d) => d.task_id)]}
          />
        </div>
      </section>
    </div>
  );
}

function DepColumn({
  title,
  icon,
  items,
  empty,
  onRemove,
  onAdd,
  excludeIds,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ depId: string; taskId: string; name: string; status: string }>;
  empty: string;
  onRemove: (depId: string) => void;
  onAdd: (otherId: string) => void;
  excludeIds: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li
              key={it.depId}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5"
            >
              <Link
                to="/tasks/$id"
                params={{ id: it.taskId }}
                className="min-w-0 flex-1 truncate text-sm hover:underline"
              >
                {it.name}
              </Link>
              <Chip tone={DONE_STATUSES.includes(it.status) ? "success" : "muted"}>
                {it.status ?? "—"}
              </Chip>
              <button
                onClick={() => onRemove(it.depId)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <TaskPicker excludeIds={excludeIds} onPick={onAdd} />
    </div>
  );
}

function TaskPicker({
  excludeIds,
  onPick,
}: {
  excludeIds: string[];
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data: results = [] } = useQuery({
    queryKey: ["tasks", "search", q],
    enabled: open && q.length >= 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status")
        .ilike("name", `%${q}%`)
        .limit(8);
      if (error) throw error;
      return (data ?? []).filter((r: any) => !excludeIds.includes(r.id));
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    );
  }
  return (
    <div className="mt-2">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tasks…"
        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
      />
      {results.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-popover">
          {results.map((r: any) => (
            <li key={r.id}>
              <button
                onClick={() => {
                  onPick(r.id);
                  setOpen(false);
                  setQ("");
                }}
                className="block w-full truncate px-2 py-1 text-left text-xs hover:bg-iris-soft/40"
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => {
          setOpen(false);
          setQ("");
        }}
        className="mt-1 text-[10px] text-muted-foreground hover:underline"
      >
        Cancel
      </button>
    </div>
  );
}
