import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { Chip } from "@/components/chips";
import { Plus, ArrowRight, AlertCircle } from "lucide-react";
import { ComponentLinkPanel } from "@/components/component-link-panel";
import { WorkContextStrip } from "@/components/work-context-strip";
import { MeasuresPanel } from "@/components/measures-panel";
import { TimeControls } from "@/components/time-controls";

export const Route = createFileRoute("/_app/projects/$id")({
  component: ProjectDetail,
});

const DONE_STATUSES = ["Done", "Complete", "Completed", "Cancelled", "Canceled", "Archived"];

function ProjectDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <WorkContextStrip entityType="project" entityId={id} />
      <ProjectTimeBlock projectId={id} />
      <ComponentLinkPanel projectId={id} />
      <ProjectPanels projectId={id} />
      <EntityDetailPage entityKey="projects" />
      <div className="px-6 pb-8">
        <MeasuresPanel subjectType="project" subjectId={id} />
      </div>
    </div>
  );
}

function ProjectTimeBlock({ projectId }: { projectId: string }) {
  const { data } = useQuery({
    queryKey: ["projects", "time", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("created_at, scheduled_for, not_before, deadline, recurrence_rule")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (!data) return null;
  return (
    <TimeControls
      table="projects"
      rowId={projectId}
      createdAt={data.created_at}
      scheduledFor={data.scheduled_for}
      notBefore={data.not_before}
      dueAt={data.deadline}
      dueColumn="deadline"
      doneColumn={null}
      recurrenceRule={data.recurrence_rule}
      invalidateKeys={[["projects", "time", projectId], ["projects", "panel", projectId]]}
    />
  );
}

function ProjectPanels({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["projects", "panel", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, owner, deadline, revenue_potential_usd, relationship_id, client_id, next_action, next_action_due")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const relId = project?.relationship_id ?? project?.client_id ?? null;
  const { data: relationship } = useQuery({
    queryKey: ["relationships", "ref", relId],
    enabled: !!relId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationships")
        .select("id, name, company")
        .eq("id", relId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "by-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status, owner, assignee_id, priority, due_date, blocked, waiting_on")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const taskIds = tasks.map((t: any) => t.id);
  const { data: blockers = [] } = useQuery({
    queryKey: ["task_blockers", "by-project", projectId, taskIds.length],
    enabled: taskIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_blockers")
        .select("task_id, blocker_task_id, blocker_name, blocker_status")
        .in("task_id", taskIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const assigneeIds = Array.from(
    new Set(tasks.map((t: any) => t.assignee_id).filter(Boolean)),
  ) as string[];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", "by-ids", assigneeIds.join(",")],
    enabled: assigneeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", assigneeIds);
      if (error) throw error;
      return data ?? [];
    },
  });
  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  const updateTask = useMutation({
    mutationFn: async ({ taskId, patch }: { taskId: string; patch: any }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", "by-project", projectId] });
      qc.invalidateQueries({ queryKey: ["task_blockers", "by-project", projectId] });
    },
  });

  const addTask = useMutation({
    mutationFn: async (name: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ name, project_id: projectId, status: "Not started", created_by: u.user?.id })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", "by-project", projectId] });
    },
  });

  if (!project) return null;

  const open = tasks.filter((t: any) => !DONE_STATUSES.includes(t.status));
  const blocked = open.filter((t: any) => t.blocked);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = open.filter((t: any) => t.due_date && t.due_date < today);

  // group by status for kanban-style columns
  const STATUS_COLS = ["Not started", "In progress", "Blocked", "Done"];
  const grouped: Record<string, any[]> = {
    "Not started": [],
    "In progress": [],
    Blocked: [],
    Done: [],
  };
  tasks.forEach((t: any) => {
    if (t.blocked && !DONE_STATUSES.includes(t.status)) {
      grouped.Blocked.push(t);
    } else if (DONE_STATUSES.includes(t.status)) {
      grouped.Done.push(t);
    } else if (t.status && grouped[t.status]) {
      grouped[t.status].push(t);
    } else {
      grouped["Not started"].push(t);
    }
  });

  // people grouping
  const peopleMap = new Map<string, { label: string; tasks: any[] }>();
  open.forEach((t: any) => {
    const key = t.assignee_id ?? `owner:${t.owner ?? "Unassigned"}`;
    const label = t.assignee_id
      ? (profileMap.get(t.assignee_id) as any)?.display_name ?? "Person"
      : t.owner ?? "Unassigned";
    if (!peopleMap.has(key)) peopleMap.set(key, { label, tasks: [] });
    peopleMap.get(key)!.tasks.push(t);
  });

  return (
    <div className="grid gap-5 px-6 pt-5 lg:grid-cols-2">
      {/* Overview */}
      <section className="panel-raised p-5 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {project.status && <Chip tone="iris">{project.status}</Chip>}
              {project.owner && <span>Owner: {project.owner}</span>}
              {project.deadline && <span>· Due {new Date(project.deadline).toLocaleDateString()}</span>}
              {project.revenue_potential_usd != null && (
                <span>· ${Number(project.revenue_potential_usd).toLocaleString()}</span>
              )}
            </div>
          </div>
          {relationship && (
            <Link
              to="/relationships/$id"
              params={{ id: relationship.id }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-iris-soft/40"
            >
              {relationship.name}
              {relationship.company && <span className="text-muted-foreground">· {relationship.company}</span>}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Open" value={open.length} />
          <Stat label="Blocked" value={blocked.length} tone={blocked.length ? "destructive" : "muted"} />
          <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "warning" : "muted"} />
          <Stat label="Total" value={tasks.length} />
        </div>
      </section>

      {/* Kanban */}
      <section className="panel-raised p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Tasks board
          </h2>
          <AddTaskInline onAdd={(name) => addTask.mutate(name)} />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {STATUS_COLS.map((col) => (
            <div key={col} className="rounded-2xl border border-border bg-surface/60 p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {col}
                </span>
                <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                  {grouped[col].length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {grouped[col].map((t: any) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    profile={t.assignee_id ? (profileMap.get(t.assignee_id) as any) : null}
                    onClick={() => navigate({ to: "/tasks/$id", params: { id: t.id } })}
                  />
                ))}
                {grouped[col].length === 0 && (
                  <div className="grid place-items-center rounded-lg border border-dashed border-border/60 px-3 py-4 text-[11px] text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Blockers */}
      <section className="panel-raised p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Blockers
        </h2>
        {blocked.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is blocked. 🎉</p>
        ) : (
          <ul className="divide-y divide-border">
            {blocked.map((t: any) => {
              const blocks = (blockers as any[]).filter((b) => b.task_id === t.id);
              return (
                <li key={t.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/tasks/$id"
                        params={{ id: t.id }}
                        className="text-sm font-medium hover:underline"
                      >
                        {t.name}
                      </Link>
                      <div className="mt-1 space-y-0.5">
                        {t.waiting_on && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Waiting on: {t.waiting_on}
                          </div>
                        )}
                        {blocks.map((b) => (
                          <div key={b.blocker_task_id} className="text-xs text-muted-foreground">
                            ↳ Blocked by{" "}
                            <Link
                              to="/tasks/$id"
                              params={{ id: b.blocker_task_id }}
                              className="hover:underline"
                            >
                              {b.blocker_name}
                            </Link>{" "}
                            <Chip tone="muted">{b.blocker_status ?? "—"}</Chip>
                          </div>
                        ))}
                      </div>
                    </div>
                    {t.waiting_on && (
                      <button
                        onClick={() => updateTask.mutate({ taskId: t.id, patch: { waiting_on: null } })}
                        className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-iris-soft/40"
                      >
                        Mark unblocked
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* People */}
      <section className="panel-raised p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          People
        </h2>
        {peopleMap.size === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          <ul className="space-y-2.5">
            {Array.from(peopleMap.entries()).map(([key, p]) => {
              const blockedCount = p.tasks.filter((t) => t.blocked).length;
              const overdueCount = p.tasks.filter(
                (t) => t.due_date && t.due_date < today,
              ).length;
              const next = p.tasks
                .filter((t) => t.due_date)
                .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];
              return (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.label}</div>
                    {next && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        Next: {next.name} · {new Date(next.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Chip tone="neutral">{p.tasks.length} open</Chip>
                    {blockedCount > 0 && <Chip tone="destructive">{blockedCount} blocked</Chip>}
                    {overdueCount > 0 && <Chip tone="warning">{overdueCount} overdue</Chip>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "destructive" | "warning" | "muted";
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-[color:var(--warning-foreground)]"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function TaskCard({
  task,
  profile,
  onClick,
}: {
  task: any;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  onClick: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = task.due_date && task.due_date < today && !DONE_STATUSES.includes(task.status);
  const initials = (profile?.display_name ?? task.owner ?? "?")
    .split(/\s+/)
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-border bg-background p-2.5 text-left text-sm shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="line-clamp-2 font-medium">{task.name}</div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-iris-soft text-[9px] font-semibold">
            {initials}
          </span>
          {profile?.display_name ?? task.owner ?? "—"}
        </span>
        {task.due_date && (
          <span className={`inline-flex items-center gap-1 ${overdue ? "text-destructive" : ""}`}>
            {overdue && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </button>
  );
}

function AddTaskInline({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-iris px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
      >
        <Plus className="h-3 w-3" /> Add task
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim());
        setName("");
        setOpen(false);
      }}
      className="flex items-center gap-2"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => !name && setOpen(false)}
        placeholder="New task name…"
        className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
      />
      <button
        type="submit"
        className="rounded-lg bg-iris px-2.5 py-1 text-xs font-medium text-white"
      >
        Add
      </button>
    </form>
  );
}
