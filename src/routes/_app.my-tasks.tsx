import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Chip } from "@/components/chips";

export const Route = createFileRoute("/_app/my-tasks")({
  component: MyTasksPage,
});

const DONE_STATUSES = ["Done", "Complete", "Completed", "Cancelled", "Canceled", "Archived"];

function MyTasksPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status, due_date, blocked, waiting_on, priority, project_id")
        .eq("assignee_id", userId!)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const open = tasks.filter((t: any) => !DONE_STATUSES.includes(t.status));

  const overdue = open.filter((t: any) => t.due_date && t.due_date < today && !t.blocked);
  const todayList = open.filter((t: any) => t.due_date === today && !t.blocked);
  const blocked = open.filter((t: any) => t.blocked && !t.waiting_on);
  const waiting = open.filter((t: any) => t.waiting_on);
  const upcoming = open.filter(
    (t: any) => t.due_date && t.due_date > today && !t.blocked,
  );
  const undated = open.filter((t: any) => !t.due_date && !t.blocked);

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything assigned to you, grouped by what's actionable now.
        </p>
      </header>

      {!userId ? (
        <p className="text-sm text-muted-foreground">Sign in to see your tasks.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Bucket title="Overdue" tone="destructive" tasks={overdue} />
          <Bucket title="Today" tone="iris" tasks={todayList} />
          <Bucket title="Blocked" tone="warning" tasks={blocked} />
          <Bucket title="Waiting on others" tone="muted" tasks={waiting} />
          <Bucket title="Upcoming" tone="neutral" tasks={upcoming} />
          <Bucket title="No due date" tone="muted" tasks={undated} />
        </div>
      )}
    </div>
  );
}

function Bucket({
  title,
  tone,
  tasks,
}: {
  title: string;
  tone: "iris" | "destructive" | "warning" | "neutral" | "muted";
  tasks: any[];
}) {
  return (
    <section className="panel-raised p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h2>
        <Chip tone={tone}>{tasks.length}</Chip>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((t: any) => (
            <li key={t.id}>
              <Link
                to="/tasks/$id"
                params={{ id: t.id }}
                className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-iris-soft/30"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.name}</div>
                  {t.waiting_on && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      Waiting on: {t.waiting_on}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                  {t.priority && <span>{t.priority}</span>}
                  {t.due_date && <span>{new Date(t.due_date).toLocaleDateString()}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
