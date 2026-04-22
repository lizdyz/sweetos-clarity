import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Link } from "@tanstack/react-router";
import { format, isPast, isToday, isThisWeek } from "date-fns";
import { Sparkles, CheckSquare, FolderKanban, Users, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_app/today")({
  component: TodayPage,
});

interface Task { id: string; name: string; due_date: string | null; status: string | null; priority: string | null; }
interface Project { id: string; name: string; sprint: string | null; current_blocker_specific: string | null; }
interface Relationship { id: string; name: string; next_action: string | null; next_action_due: string | null; }
interface Session { id: string; name: string; session_date: string | null; sweetcycle_phase: string | null; seed_status: string | null; }

function TodayPage() {
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["today", "tasks"],
    queryFn: async () => {
      const { data } = await sb.from("tasks").select("*").neq("status", "Done").order("due_date", { ascending: true });
      return data ?? [];
    },
  });
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["today", "projects"],
    queryFn: async () => {
      const { data } = await sb.from("projects").select("*").eq("sprint", "This Week");
      return data ?? [];
    },
  });
  const { data: rels } = useQuery<Relationship[]>({
    queryKey: ["today", "rels"],
    queryFn: async () => {
      const { data } = await sb.from("relationships").select("*").not("next_action_due", "is", null);
      return data ?? [];
    },
  });
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["today", "sessions"],
    queryFn: async () => {
      const { data } = await sb.from("sessions").select("*").order("session_date", { ascending: true });
      return data ?? [];
    },
  });

  const overdue = (tasks ?? []).filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const dueToday = (tasks ?? []).filter((t) => t.due_date && isToday(new Date(t.due_date)));
  const dueWeek = (tasks ?? []).filter((t) => t.due_date && !isToday(new Date(t.due_date)) && isThisWeek(new Date(t.due_date), { weekStartsOn: 1 }));
  const blocked = (tasks ?? []).filter((t) => t.status === "Blocked" || t.status === "Waiting");
  const overdueRels = (rels ?? []).filter((r) => r.next_action_due && isPast(new Date(r.next_action_due)));
  const pendingSessions = (sessions ?? []).filter((s) => s.seed_status?.includes("Pending") || s.sweetcycle_phase === "Seed");

  return (
    <div className="px-6 py-5">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Overdue" icon={CheckSquare} tone="warning" count={overdue.length}>
          {overdue.length === 0 ? <Empty>Nothing overdue. Beautiful.</Empty> : overdue.map((t) => (
            <Row key={t.id} to={`/tasks/${t.id}`} title={t.name} meta={t.due_date ? `Due ${format(new Date(t.due_date), "MMM d")}` : ""} />
          ))}
        </Section>

        <Section title="Due today" icon={CheckSquare} count={dueToday.length}>
          {dueToday.length === 0 ? <Empty>Nothing due today.</Empty> : dueToday.map((t) => (
            <Row key={t.id} to={`/tasks/${t.id}`} title={t.name} meta={t.priority ?? ""} />
          ))}
        </Section>

        <Section title="This week" icon={CheckSquare} count={dueWeek.length}>
          {dueWeek.length === 0 ? <Empty>No tasks queued for this week.</Empty> : dueWeek.map((t) => (
            <Row key={t.id} to={`/tasks/${t.id}`} title={t.name} meta={t.due_date ? format(new Date(t.due_date), "EEE") : ""} />
          ))}
        </Section>

        <Section title="Blocked / waiting" icon={CheckSquare} count={blocked.length}>
          {blocked.length === 0 ? <Empty>Nothing blocked.</Empty> : blocked.map((t) => (
            <Row key={t.id} to={`/tasks/${t.id}`} title={t.name} meta={t.status ?? ""} />
          ))}
        </Section>

        <Section title="Active sprints" icon={FolderKanban} count={(projects ?? []).length}>
          {(projects ?? []).length === 0 ? <Empty>No projects in this week's sprint.</Empty> : (projects ?? []).map((p) => (
            <Row key={p.id} to={`/projects/${p.id}`} title={p.name} meta={p.current_blocker_specific ? "Blocked" : "On track"} />
          ))}
        </Section>

        <Section title="Overdue follow-ups" icon={Users} tone="warning" count={overdueRels.length}>
          {overdueRels.length === 0 ? <Empty>All caught up.</Empty> : overdueRels.map((r) => (
            <Row key={r.id} to={`/relationships/${r.id}`} title={r.name} meta={r.next_action ?? ""} />
          ))}
        </Section>

        <Section title="Pending sessions" icon={CalendarClock} count={pendingSessions.length}>
          {pendingSessions.length === 0 ? <Empty>No sessions awaiting seed.</Empty> : pendingSessions.map((s) => (
            <Row key={s.id} to={`/sessions/${s.id}`} title={s.name} meta={s.sweetcycle_phase ?? ""} />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, count, tone, children }: { title: string; icon: typeof CheckSquare; count: number; tone?: "warning"; children: React.ReactNode }) {
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className={"h-4 w-4 " + (tone === "warning" ? "text-[color:var(--warning-foreground)]" : "text-[color:var(--iris-violet)]")} />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{count}</span>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}
function Row({ to, title, meta }: { to: string; title: string; meta?: string }) {
  return (
    <Link to={to} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-iris-soft/50">
      <span className="truncate font-medium">{title}</span>
      {meta && <span className="ml-3 shrink-0 text-xs text-muted-foreground">{meta}</span>}
    </Link>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 text-center text-xs text-muted-foreground">{children}</div>;
}
