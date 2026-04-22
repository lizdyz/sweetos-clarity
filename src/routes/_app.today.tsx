import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { format, isPast, isToday, isThisWeek, formatDistanceToNow } from "date-fns";
import {
  Sparkles, CheckSquare, CalendarClock, Eye, GitBranch, Diamond, Zap,
  Trophy, ShieldCheck, TrendingUp, Lightbulb, Megaphone, FolderKanban, FlaskConical,
} from "lucide-react";
import { FiredKtisStrip } from "@/components/fired-ktis-strip";
import { MasterStoryTrail } from "@/components/master-story-trail";

export const Route = createFileRoute("/_app/today")({
  component: TodayPage,
});

type EntityType = "task" | "project" | "session" | "campaign" | "spark" | "decision";

interface TimeGridRow {
  entity_type: EntityType;
  entity_id: string;
  name: string;
  due_date: string | null;
  scheduled_for: string | null;
  not_before: string | null;
  done_at: string | null;
  relationship_id: string | null;
  recurrence_rule: string | null;
  status: string | null;
}

interface DoneRow {
  entity_type: EntityType;
  entity_id: string;
  name: string;
  done_at: string;
  relationship_id: string | null;
}

interface ApprovalRow {
  step_run_id: string;
  run_id: string;
  step_name: string;
  workflow_id: string;
  started_at: string | null;
}

interface ReadyRow {
  rubric_id: string;
  subject_kind: string;
  subject_id: string;
  relationship_id: string | null;
  current_level: string;
}

const DONE_STATUSES = new Set([
  "Done", "Complete", "Completed", "Shipped", "Cancelled", "Canceled", "Archived",
]);

function TodayPage() {
  const { data: grid = [] } = useQuery<TimeGridRow[]>({
    queryKey: ["today", "time_grid"],
    queryFn: async () => {
      const { data, error } = await sb.from("time_grid").select("*").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: wins = [] } = useQuery<DoneRow[]>({
    queryKey: ["today", "recent_done"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("recent_done_log")
        .select("*")
        .order("done_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: approvals = [] } = useQuery<ApprovalRow[]>({
    queryKey: ["today", "approvals"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("workflow_step_pipeline")
        .select("step_run_id, run_id, step_name, workflow_id, started_at")
        .eq("run_status", "awaiting_approval")
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ready = [] } = useQuery<ReadyRow[]>({
    queryKey: ["today", "ready_to_advance"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("maturity_threshold_progress")
        .select("rubric_id, subject_kind, subject_id, relationship_id, current_level")
        .eq("ready_to_advance", true)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const open = grid.filter((r) => !r.done_at && !DONE_STATUSES.has(r.status ?? ""));
  const dateOf = (r: TimeGridRow) => r.due_date ?? r.scheduled_for;

  const overdue = open.filter((r) => {
    const d = dateOf(r);
    return d && isPast(new Date(d)) && !isToday(new Date(d));
  });
  const dueToday = open.filter((r) => {
    const d = dateOf(r);
    return d && isToday(new Date(d));
  });
  const dueWeek = open.filter((r) => {
    const d = dateOf(r);
    return d && !isToday(new Date(d)) && !isPast(new Date(d)) && isThisWeek(new Date(d), { weekStartsOn: 1 });
  });
  const blocked = open.filter((r) => r.status === "Blocked" || r.status === "Waiting");
  const sessionsPending = open.filter((r) => r.entity_type === "session");

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

      <FiredKtisStrip />
      <MasterStoryTrail />

      <div className="mb-5 grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
        <OcdaTileStrip />
        <DecisionQueueWidget />
        <SandboxTile />
      </div>

      {(approvals.length > 0 || ready.length > 0) && (
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          {approvals.length > 0 && (
            <Section title="Awaiting your approval" icon={ShieldCheck} tone="warning" count={approvals.length}>
              {approvals.map((a) => (
                <Link
                  key={a.step_run_id}
                  to="/workflows/$id/runs/$runId"
                  params={{ id: a.workflow_id, runId: a.run_id }}
                  className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-iris-soft/50"
                >
                  <span className="truncate font-medium">{a.step_name}</span>
                  {a.started_at && (
                    <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.started_at), { addSuffix: true })}
                    </span>
                  )}
                </Link>
              ))}
            </Section>
          )}
          {ready.length > 0 && (
            <Section title="Maturity wins ready to claim" icon={TrendingUp} tone="success" count={ready.length}>
              {ready.map((r) => (
                <Link
                  key={r.rubric_id}
                  to="/relationships/$id"
                  params={{ id: r.relationship_id ?? "" }}
                  className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-iris-soft/50"
                >
                  <span className="truncate font-medium">{r.subject_kind} · {r.current_level}</span>
                  <span className="ml-3 shrink-0 text-xs text-emerald-600 dark:text-emerald-400">Advance →</span>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Overdue" icon={CheckSquare} tone="warning" count={overdue.length}>
          {overdue.length === 0 ? <Empty>Nothing overdue. Beautiful.</Empty> : overdue.map((r) => (
            <ItemRow key={`${r.entity_type}-${r.entity_id}`} item={r} meta={dateOf(r) ? `Due ${format(new Date(dateOf(r)!), "MMM d")}` : ""} />
          ))}
        </Section>

        <Section title="Due today" icon={CheckSquare} count={dueToday.length}>
          {dueToday.length === 0 ? <Empty>Nothing due today.</Empty> : dueToday.map((r) => (
            <ItemRow key={`${r.entity_type}-${r.entity_id}`} item={r} meta={r.status ?? ""} />
          ))}
        </Section>

        <Section title="This week" icon={CheckSquare} count={dueWeek.length}>
          {dueWeek.length === 0 ? <Empty>No items queued for this week.</Empty> : dueWeek.map((r) => (
            <ItemRow key={`${r.entity_type}-${r.entity_id}`} item={r} meta={dateOf(r) ? format(new Date(dateOf(r)!), "EEE") : ""} />
          ))}
        </Section>

        <Section title="Blocked / waiting" icon={CheckSquare} count={blocked.length}>
          {blocked.length === 0 ? <Empty>Nothing blocked.</Empty> : blocked.map((r) => (
            <ItemRow key={`${r.entity_type}-${r.entity_id}`} item={r} meta={r.status ?? ""} />
          ))}
        </Section>

        <Section title="Pending sessions" icon={CalendarClock} count={sessionsPending.length}>
          {sessionsPending.length === 0 ? <Empty>No sessions awaiting.</Empty> : sessionsPending.map((r) => (
            <ItemRow key={`${r.entity_type}-${r.entity_id}`} item={r} meta={r.status ?? ""} />
          ))}
        </Section>

        <Section title="Wins this week" icon={Trophy} tone="success" count={wins.length}>
          {wins.length === 0 ? <Empty>Nothing shipped in the last 14 days yet.</Empty> : wins.slice(0, 8).map((w) => (
            <ItemRow
              key={`${w.entity_type}-${w.entity_id}`}
              item={{ ...w, due_date: null, scheduled_for: null, not_before: null, recurrence_rule: null, status: null } as TimeGridRow}
              meta={formatDistanceToNow(new Date(w.done_at), { addSuffix: true })}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

const KIND_ICON: Record<EntityType, typeof CheckSquare> = {
  task: CheckSquare,
  project: FolderKanban,
  session: CalendarClock,
  campaign: Megaphone,
  spark: Lightbulb,
  decision: Diamond,
};
const KIND_COLOR: Record<EntityType, string> = {
  task: "text-[color:var(--iris-violet)]",
  project: "text-emerald-600 dark:text-emerald-400",
  session: "text-sky-600 dark:text-sky-400",
  campaign: "text-amber-600 dark:text-amber-400",
  spark: "text-violet-600 dark:text-violet-400",
  decision: "text-rose-600 dark:text-rose-400",
};

function hrefFor(kind: EntityType, id: string): string {
  switch (kind) {
    case "task": return `/tasks/${id}`;
    case "project": return `/projects/${id}`;
    case "session": return `/sessions/${id}`;
    case "campaign": return `/campaigns/${id}`;
    case "spark": return `/sparks/${id}`;
    case "decision": return `/decisions/${id}`;
  }
}

function ItemRow({ item, meta }: { item: TimeGridRow; meta?: string }) {
  const Icon = KIND_ICON[item.entity_type];
  return (
    <a
      href={hrefFor(item.entity_type, item.entity_id)}
      className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-iris-soft/50"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${KIND_COLOR[item.entity_type]}`} />
      <span className="truncate font-medium">{item.name}</span>
      {meta && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{meta}</span>}
    </a>
  );
}

function Section({ title, icon: Icon, count, tone, children }: { title: string; icon: typeof CheckSquare; count: number; tone?: "warning" | "success"; children: React.ReactNode }) {
  const toneClass =
    tone === "warning" ? "text-[color:var(--warning-foreground)]" :
    tone === "success" ? "text-emerald-600 dark:text-emerald-400" :
    "text-[color:var(--iris-violet)]";
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${toneClass}`} />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{count}</span>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 text-center text-xs text-muted-foreground">{children}</div>;
}

function OcdaTileStrip() {
  const { data: counts } = useQuery({
    queryKey: ["today", "ocda-counts"],
    queryFn: async () => {
      const [obs, choose, decide, act] = await Promise.all([
        sb.from("captures").select("id", { count: "exact", head: true }).eq("status", "Pending"),
        sb.from("proposals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        sb.from("decisions").select("id", { count: "exact", head: true }).eq("status", "Open"),
        sb.from("tasks").select("id", { count: "exact", head: true }).eq("status", "Ready"),
      ]);
      return {
        observe: obs.count ?? 0,
        choose: choose.count ?? 0,
        decide: decide.count ?? 0,
        act: act.count ?? 0,
      };
    },
  });

  const tiles = [
    { key: "observe", label: "Observe", count: counts?.observe ?? 0, icon: Eye, hint: "captures pending review" },
    { key: "choose", label: "Choose", count: counts?.choose ?? 0, icon: GitBranch, hint: "proposals waiting" },
    { key: "decide", label: "Decide", count: counts?.decide ?? 0, icon: Diamond, hint: "open decisions" },
    { key: "act", label: "Act", count: counts?.act ?? 0, icon: Zap, hint: "ready tasks" },
  ];

  return (
    <Link to="/operate/ocda" className="block">
      <section className="panel-raised grid grid-cols-2 gap-3 p-4 transition hover:shadow-[var(--shadow-glow)] sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.key} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris-soft text-[color:var(--iris-violet)]">
              <t.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums">{t.count}</span>
                <span className="text-xs font-medium text-muted-foreground">{t.label}</span>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">{t.hint}</p>
            </div>
          </div>
        ))}
      </section>
    </Link>
  );
}

interface DecisionRow {
  id: string;
  decision: string;
  status: string | null;
  date_made: string | null;
  context: string | null;
}

function DecisionQueueWidget() {
  const { data: decisions = [] } = useQuery<DecisionRow[]>({
    queryKey: ["today", "decision-queue"],
    queryFn: async () => {
      const { data } = await sb
        .from("decisions")
        .select("id, decision, status, date_made, context")
        .eq("status", "Open")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Diamond className="h-4 w-4 text-[color:var(--iris-violet)]" />
          <h2 className="text-sm font-semibold">Decision queue</h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {decisions.length}
        </span>
      </header>
      <div className="divide-y divide-border">
        {decisions.length === 0 ? (
          <Empty>No open decisions waiting.</Empty>
        ) : (
          decisions.map((d) => (
            <Link
              key={d.id}
              to="/decisions/$id"
              params={{ id: d.id }}
              className="block px-5 py-2.5 hover:bg-iris-soft/50"
            >
              <div className="truncate text-sm font-medium">{d.decision}</div>
              {d.context && (
                <div className="truncate text-[11px] text-muted-foreground">{d.context}</div>
              )}
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
