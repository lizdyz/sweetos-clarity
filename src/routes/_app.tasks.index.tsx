import { createFileRoute, Link } from "@tanstack/react-router";
import { TaskCreateSheet } from "@/components/task-create-sheet";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/chips";
import { TasksPipelineRibbon } from "@/components/tasks-pipeline-ribbon";
import { TaskProvenanceChip, type SpawnedByKind } from "@/components/task-provenance-chip";
import { UniversalFilterBar } from "@/components/universal-filter-bar";
import { universalFilterSchema } from "@/lib/use-universal-filters";
import {
  Search,
  Filter,
  ListChecks,
  AlertTriangle,
  CalendarClock,
  Flame,
  Link as LinkIcon,
  Zap,
  Target,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isPast, isToday, differenceInDays } from "date-fns";

export const Route = createFileRoute("/_app/tasks/")({
  validateSearch: zodValidator(universalFilterSchema),
  component: TasksIndexPage,
});

interface TaskRow {
  id: string;
  name: string;
  status: string | null;
  due_date: string | null;
  scheduled_for: string | null;
  blocked: boolean | null;
  assignee_id: string | null;
  operator_id: string | null;
  relationship_id: string | null;
  project_id: string | null;
  updated_at: string;
  created_by: string;
  spawned_by_kind: SpawnedByKind;
  spawned_by_id: string | null;
}
interface BlockerRow {
  task_id: string;
  blocker_task_id: string;
  blocker_name: string;
  blocker_status: string | null;
}
interface RelMin {
  id: string;
  name: string;
}
interface OpMin {
  id: string;
  display_name: string | null;
}

type Mode = "all" | "mine" | "blocked" | "overdue" | "unscheduled";
type GroupBy = "status" | "relationship" | "operator" | "due";

const STATUS_ORDER = ["In Progress", "Not Started", "To Do", "Waiting", "Blocked", "Done"];
const CLOSED = new Set(["Done", "Complete", "Completed", "Cancelled", "Canceled", "Archived"]);

function dueBucket(t: TaskRow): string {
  if (!t.due_date) return "Unscheduled";
  const d = parseISO(t.due_date);
  if (isPast(d) && !isToday(d)) return "Overdue";
  if (isToday(d)) return "Today";
  const diff = (d.getTime() - Date.now()) / 86_400_000;
  if (diff <= 7) return "This week";
  if (diff <= 30) return "This month";
  return "Later";
}

interface NextUpItem {
  task: TaskRow;
  reason: "due-today" | "kti-fire" | "leverage" | "stalled";
  badge: string;
  blocksCount?: number;
}

function TasksIndexPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tasks = [] } = useQuery<TaskRow[]>({
    queryKey: ["tasks-index"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("tasks")
        .select(
          "id, name, status, due_date, scheduled_for, blocked, assignee_id, operator_id, relationship_id, project_id, updated_at, created_by, spawned_by_kind, spawned_by_id",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });

  const { data: blockers = [] } = useQuery<BlockerRow[]>({
    queryKey: ["task-blockers-index"],
    queryFn: async () => {
      const { data, error } = await sb.from("task_blockers").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rels = [] } = useQuery<RelMin[]>({
    queryKey: ["relationships-min-for-tasks"],
    queryFn: async () => {
      const { data, error } = await sb.from("relationships").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ops = [] } = useQuery<OpMin[]>({
    queryKey: ["operators-min-for-tasks"],
    queryFn: async () => {
      const { data, error } = await sb.from("operators").select("id, display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // blocker_task_id is the blocker; task_id is what it blocks. Map blocker → list of tasks it unblocks.
  const blockerMap = useMemo(() => {
    const m = new Map<string, BlockerRow[]>();
    blockers.forEach((b) => {
      const arr = m.get(b.task_id) ?? [];
      arr.push(b);
      m.set(b.task_id, arr);
    });
    return m;
  }, [blockers]);

  const blocksMap = useMemo(() => {
    // For each task, how many other tasks does it block?
    const m = new Map<string, number>();
    blockers.forEach((b) => {
      m.set(b.blocker_task_id, (m.get(b.blocker_task_id) ?? 0) + 1);
    });
    return m;
  }, [blockers]);

  const relMap = useMemo(() => new Map(rels.map((r) => [r.id, r.name])), [rels]);
  const opMap = useMemo(() => new Map(ops.map((o) => [o.id, o.display_name ?? "—"])), [ops]);

  // ─── NEXT UP LANE ────────────────────────────────────────────────────────
  const nextUp = useMemo<NextUpItem[]>(() => {
    const open = tasks.filter((t) => !CLOSED.has(t.status ?? ""));
    const items: NextUpItem[] = [];
    const seen = new Set<string>();

    // 1. Unblocked & due today
    for (const t of open) {
      if (t.blocked) continue;
      if (!t.due_date) continue;
      if (!isToday(parseISO(t.due_date))) continue;
      if (seen.has(t.id)) continue;
      items.push({ task: t, reason: "due-today", badge: "Due today" });
      seen.add(t.id);
    }
    // 2. Unblocked & spawned by KTI
    for (const t of open) {
      if (t.blocked) continue;
      if (t.spawned_by_kind !== "kti") continue;
      if (seen.has(t.id)) continue;
      items.push({ task: t, reason: "kti-fire", badge: "From KTI fire" });
      seen.add(t.id);
    }
    // 3. Unblocking the most other work
    const leverage = open
      .filter((t) => !t.blocked && (blocksMap.get(t.id) ?? 0) > 0 && !seen.has(t.id))
      .sort((a, b) => (blocksMap.get(b.id) ?? 0) - (blocksMap.get(a.id) ?? 0))
      .slice(0, 3);
    for (const t of leverage) {
      items.push({
        task: t,
        reason: "leverage",
        badge: `Unblocks ${blocksMap.get(t.id)}`,
        blocksCount: blocksMap.get(t.id),
      });
      seen.add(t.id);
    }
    // 4. Started but stalled ≥3 days
    for (const t of open) {
      if (t.status !== "In Progress") continue;
      if (differenceInDays(new Date(), new Date(t.updated_at)) < 3) continue;
      if (seen.has(t.id)) continue;
      items.push({ task: t, reason: "stalled", badge: "Stalled" });
      seen.add(t.id);
      if (items.length >= 8) break;
    }

    return items.slice(0, 8);
  }, [tasks, blocksMap]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (mode === "mine" && t.created_by !== user?.id && t.assignee_id !== user?.id) return false;
      if (mode === "blocked" && !t.blocked) return false;
      if (mode === "overdue") {
        if (!t.due_date) return false;
        const d = parseISO(t.due_date);
        if (!isPast(d) || isToday(d)) return false;
        if (CLOSED.has(t.status ?? "")) return false;
      }
      if (mode === "unscheduled" && (t.due_date || t.scheduled_for)) return false;
      return true;
    });
  }, [tasks, q, mode, user?.id]);

  const groups = useMemo(() => {
    const m = new Map<string, TaskRow[]>();
    filtered.forEach((t) => {
      let key = "—";
      if (groupBy === "status") key = t.status ?? "—";
      if (groupBy === "relationship")
        key = t.relationship_id ? (relMap.get(t.relationship_id) ?? "—") : "No relationship";
      if (groupBy === "operator")
        key = t.operator_id ? (opMap.get(t.operator_id) ?? "—") : "Unassigned";
      if (groupBy === "due") key = dueBucket(t);
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    });
    const entries = Array.from(m.entries());
    if (groupBy === "status") {
      entries.sort(
        (a, b) => STATUS_ORDER.indexOf(a[0]) - STATUS_ORDER.indexOf(b[0]),
      );
    } else if (groupBy === "due") {
      const order = ["Overdue", "Today", "This week", "This month", "Later", "Unscheduled"];
      entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entries;
  }, [filtered, groupBy, relMap, opMap]);

  const blockedCount = tasks.filter((t) => t.blocked).length;
  const overdueCount = tasks.filter(
    (t) => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && !CLOSED.has(t.status ?? ""),
  ).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-6">
      <PageHeader
        icon={<ListChecks className="h-5 w-5" />}
        title="Tasks"
        purpose="Every task in the system across every relationship and project. Use My Tasks for what's assigned to you, Today for live working surface."
        whatYouCanDo={[
          "Filter by Mine, Blocked, Overdue, or Unscheduled",
          "Group by status, due, relationship, or operator",
          "Open a task to set OCDA stage, time, dependencies",
        ]}
        connectsTo={[
          { to: "/today", label: "Today" },
          { to: "/my-tasks", label: "My Tasks" },
          { to: "/projects", label: "Projects" },
          { to: "/operate/ocda", label: "OCDA Cockpit" },
        ]}
        nextSteps={[
          `${overdueCount} overdue`,
          `${blockedCount} blocked`,
          `${tasks.length} total`,
        ]}
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}>+ New task</Button>}
      />

      {/* Pipeline ribbon */}
      <TasksPipelineRibbon />

      <UniversalFilterBar
        stateOptions={["To Do", "In Progress", "Waiting", "Blocked", "Done"]}
      />

      {/* Next up lane */}
      {nextUp.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border/60 bg-iris-soft/40 px-4 py-2">
            <Zap className="h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Next up
            </span>
            <span className="text-[10px] text-muted-foreground">
              · highest-leverage moves right now
            </span>
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
              {nextUp.length}
            </span>
          </div>
          <div className="divide-y divide-border/50">
            {nextUp.map(({ task: t, reason, badge }) => (
              <Link
                key={`nx-${t.id}`}
                to="/tasks/$id"
                params={{ id: t.id }}
                className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted/40"
              >
                <ReasonDot reason={reason} />
                <span className="truncate font-medium">{t.name}</span>
                <span className="shrink-0 rounded-full border border-border bg-background px-1.5 py-0 text-[9px] font-medium text-muted-foreground">
                  {badge}
                </span>
                <TaskProvenanceChip kind={t.spawned_by_kind} id={t.spawned_by_id} />
                {t.relationship_id && (
                  <span className="shrink-0 rounded-full bg-iris-soft px-1.5 py-0 text-[9px]">
                    {relMap.get(t.relationship_id) ?? "—"}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {t.due_date ? format(parseISO(t.due_date), "MMM d") : "—"}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3 w-3" /> Show
          </div>
          {(
            [
              { id: "all", label: "All" },
              { id: "mine", label: "Mine" },
              { id: "blocked", label: `Blocked (${blockedCount})` },
              { id: "overdue", label: `Overdue (${overdueCount})` },
              { id: "unscheduled", label: "Unscheduled" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                mode === opt.id
                  ? "border-iris bg-iris-soft"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}

          <span className="ml-2 text-[11px] uppercase tracking-wider text-muted-foreground">Group by</span>
          {(
            [
              { id: "status", label: "Status" },
              { id: "due", label: "Due" },
              { id: "relationship", label: "Relationship" },
              { id: "operator", label: "Operator" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setGroupBy(opt.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                groupBy === opt.id
                  ? "border-iris bg-iris-soft"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}

          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-8 w-[200px] pl-7 text-xs"
            />
          </div>
        </div>
      </Card>

      {groups.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No tasks match these filters.
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(([groupKey, items]) => (
            <Card key={groupKey} className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupKey}
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">{items.length}</div>
              </div>
              <div className="divide-y divide-border/50">
                {items.map((t) => {
                  const taskBlockers = blockerMap.get(t.id) ?? [];
                  const blocksN = blocksMap.get(t.id) ?? 0;
                  const due = t.due_date ? parseISO(t.due_date) : null;
                  const isDueOverdue = due ? isPast(due) && !isToday(due) && !CLOSED.has(t.status ?? "") : false;
                  return (
                    <Link
                      key={t.id}
                      to="/tasks/$id"
                      params={{ id: t.id }}
                      className="block px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "truncate font-medium",
                                CLOSED.has(t.status ?? "") && "text-muted-foreground line-through",
                              )}
                            >
                              {t.name}
                            </span>
                            {t.status && (
                              <Chip tone="neutral" className="h-4 text-[9px]">
                                {t.status}
                              </Chip>
                            )}
                            {t.blocked && (
                              <Chip tone="warning" className="h-4 text-[9px]">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Blocked
                              </Chip>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {/* Provenance chip — why does this task exist */}
                            <TaskProvenanceChip kind={t.spawned_by_kind} id={t.spawned_by_id} />
                            {/* Downstream — what does this task unblock */}
                            {blocksN > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-1.5 py-0 text-[9px] font-medium text-purple-600 dark:text-purple-400">
                                <LinkIcon className="h-2.5 w-2.5" />
                                Unblocks {blocksN}
                              </span>
                            )}
                            {due && (
                              <Chip
                                tone={isDueOverdue ? "destructive" : "muted"}
                                className="h-4 text-[9px]"
                              >
                                <CalendarClock className="h-2.5 w-2.5" />
                                {isDueOverdue && <Flame className="h-2.5 w-2.5" />}
                                {format(due, "MMM d")}
                              </Chip>
                            )}
                            {t.operator_id && (
                              <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                                {opMap.get(t.operator_id) ?? "—"}
                              </span>
                            )}
                            {t.relationship_id && (
                              <span className="rounded-full border border-border bg-iris-soft px-1.5 py-0.5 text-[9px]">
                                {relMap.get(t.relationship_id) ?? "—"}
                              </span>
                            )}
                          </div>
                          {taskBlockers.length > 0 && (
                            <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-[color:var(--warning)]/8 px-2 py-1 text-[10px] text-[color:var(--warning-foreground)]">
                              <LinkIcon className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                              <span className="line-clamp-1">
                                Blocked by:{" "}
                                {taskBlockers
                                  .map((b) => `${b.blocker_name} (${b.blocker_status ?? "—"})`)
                                  .join(" · ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <TaskCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ReasonDot({ reason }: { reason: NextUpItem["reason"] }) {
  if (reason === "due-today")
    return <Target className="h-3 w-3 shrink-0 text-emerald-500" aria-label="Due today" />;
  if (reason === "kti-fire")
    return <Flame className="h-3 w-3 shrink-0 text-amber-500" aria-label="KTI fire" />;
  if (reason === "leverage")
    return <TrendingUp className="h-3 w-3 shrink-0 text-purple-500" aria-label="High leverage" />;
  return <Clock className="h-3 w-3 shrink-0 text-orange-500" aria-label="Stalled" />;
}
