import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CalendarDaySheet, type CalendarEvent } from "@/components/calendar-day-sheet";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

const KIND_TONE: Record<CalendarEvent["kind"], string> = {
  task: "bg-iris/15 text-[color:var(--iris-violet)] border-iris/30",
  session: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  campaign: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  decision: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  spark: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/30",
};

// Extend the shared CalendarEvent kind locally to include "spark" tone (sheet covers task/session/campaign/decision)
type GridEvent = Omit<CalendarEvent, "kind"> & { kind: CalendarEvent["kind"] | "spark" };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const qc = useQueryClient();

  const monthStart = startOfMonth(cursor);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const rangeStart = fmt(monthStart);
  const rangeEnd = fmt(monthEnd);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar", rangeStart, rangeEnd],
    queryFn: async () => {
      const [taskRes, sessionRes, campaignRes, decisionRes, sparkRes] = await Promise.all([
        sb
          .from("tasks")
          .select("id, name, due_date, scheduled_for, status")
          .or(`due_date.gte.${rangeStart},scheduled_for.gte.${rangeStart}`)
          .or(`due_date.lte.${rangeEnd},scheduled_for.lte.${rangeEnd}`)
          .limit(500),
        sb
          .from("sessions")
          .select("id, name, session_date, scheduled_for, status")
          .or(`session_date.gte.${rangeStart},scheduled_for.gte.${rangeStart}`)
          .or(`session_date.lte.${rangeEnd},scheduled_for.lte.${rangeEnd}`)
          .limit(500),
        sb
          .from("campaigns")
          .select("id, campaign_name, deadline, scheduled_for, status")
          .or(`deadline.gte.${rangeStart},scheduled_for.gte.${rangeStart}`)
          .or(`deadline.lte.${rangeEnd},scheduled_for.lte.${rangeEnd}`)
          .limit(500),
        sb
          .from("decisions")
          .select("id, decision, date_made, status")
          .gte("date_made", rangeStart)
          .lte("date_made", rangeEnd)
          .limit(500),
        sb
          .from("sparks")
          .select("id, title, due_date, scheduled_for, status")
          .or(`due_date.gte.${rangeStart},scheduled_for.gte.${rangeStart}`)
          .or(`due_date.lte.${rangeEnd},scheduled_for.lte.${rangeEnd}`)
          .limit(500),
      ]);
      const out: GridEvent[] = [];
      for (const t of (taskRes.data ?? []) as Array<{ id: string; name: string; due_date: string | null; scheduled_for: string | null; status: string | null }>) {
        const d = t.scheduled_for ?? t.due_date;
        if (d) out.push({ id: t.id, kind: "task", name: t.name, date: d.slice(0, 10), href: `/tasks/${t.id}`, status: t.status });
      }
      for (const s of (sessionRes.data ?? []) as Array<{ id: string; name: string; session_date: string | null; scheduled_for: string | null; status: string | null }>) {
        const d = s.session_date ?? s.scheduled_for;
        if (d) out.push({ id: s.id, kind: "session", name: s.name, date: d.slice(0, 10), href: `/sessions/${s.id}`, status: s.status });
      }
      for (const c of (campaignRes.data ?? []) as Array<{ id: string; campaign_name: string; deadline: string | null; scheduled_for: string | null; status: string | null }>) {
        const d = c.scheduled_for ?? c.deadline;
        if (d) out.push({ id: c.id, kind: "campaign", name: c.campaign_name, date: d.slice(0, 10), href: `/campaigns/${c.id}`, status: c.status });
      }
      for (const d of (decisionRes.data ?? []) as Array<{ id: string; decision: string; date_made: string | null; status: string | null }>) {
        if (d.date_made) out.push({ id: d.id, kind: "decision", name: d.decision, date: d.date_made.slice(0, 10), href: `/decisions/${d.id}`, status: d.status });
      }
      for (const sp of (sparkRes.data ?? []) as Array<{ id: string; title: string; due_date: string | null; scheduled_for: string | null; status: string | null }>) {
        const d = sp.scheduled_for ?? sp.due_date;
        if (d) out.push({ id: sp.id, kind: "spark", name: sp.title, date: d.slice(0, 10), href: `/sparks/${sp.id}`, status: sp.status });
      }
      return out;
    },
  });

  const byDay = useMemo(() => {
    const m = new Map<string, GridEvent[]>();
    events.forEach((e) => {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    });
    return m;
  }, [events]);

  const grid = useMemo(() => {
    const firstWeekday = (monthStart.getDay() + 6) % 7;
    const cells: { date: Date; inMonth: boolean }[] = [];
    const start = new Date(monthStart);
    start.setDate(start.getDate() - firstWeekday);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === monthStart.getMonth() });
    }
    return cells;
  }, [monthStart]);

  const monthLabel = monthStart.toLocaleString(undefined, { month: "long", year: "numeric" });
  const today = fmt(new Date());

  const quickAdd = useMutation({
    mutationFn: async ({ kind, name, date }: { kind: "task" | "session" | "decision"; name: string; date: string }) => {
      const { data: userData } = await sb.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");
      if (kind === "task") {
        const { error } = await sb.from("tasks").insert({ name, scheduled_for: date, due_date: date, status: "To Do", created_by: userId });
        if (error) throw error;
      } else if (kind === "session") {
        const { error } = await sb.from("sessions").insert({ name, session_date: date, scheduled_for: date, status: "scheduled", created_by: userId });
        if (error) throw error;
      } else {
        const { error } = await sb.from("decisions").insert({ decision: name, date_made: date, status: "open", created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.kind[0].toUpperCase()}${vars.kind.slice(1)} added on ${vars.date}`);
      qc.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to add"),
  });

  const sheetEvents: CalendarEvent[] = useMemo(() => {
    if (!selectedDay) return [];
    return (byDay.get(selectedDay) ?? []).map((e) => ({
      ...e,
      // Sheet only knows 4 kinds — collapse spark → task styling visually but keep label honest via cast
      kind: (e.kind === "spark" ? "task" : e.kind) as CalendarEvent["kind"],
    }));
  }, [selectedDay, byDay]);

  return (
    <div className="px-6 py-6">
      <PageHeader
        icon={<CalIcon className="h-5 w-5" />}
        title="Calendar"
        purpose="Visual time view of everything with a date — tasks, sessions, campaigns, decisions, sparks. Click any day to open it."
        whatYouCanDo={[
          "Click a day cell to see all events and quick-add",
          "Click an event chip to jump to its detail page",
          "Navigate by month or jump back to today",
        ]}
        actions={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setCursor(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium">{monthLabel}</span>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setCursor(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 ml-1" onClick={() => setCursor(startOfMonth(new Date()))}>
              Today
            </Button>
          </div>
        }
      />
      <Card className="panel-raised p-3">
        <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-1.5 py-1">{d}</div>
          ))}
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading events…
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {grid.map(({ date, inMonth }, i) => {
              const k = fmt(date);
              const list = byDay.get(k) ?? [];
              const isToday = k === today;
              const isSelected = k === selectedDay;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedDay(k);
                    setSheetOpen(true);
                  }}
                  className={cn(
                    "group min-h-[96px] rounded-lg border p-1.5 text-left transition-all cursor-pointer",
                    "hover:border-iris/50 hover:shadow-[var(--shadow-elevated)] hover:bg-iris/[0.03]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris/60",
                    inMonth ? "border-border/60 bg-surface" : "border-border/30 bg-muted/20",
                    isToday && "ring-1 ring-iris/60",
                    isSelected && "bg-iris/10 ring-2 ring-iris/70 shadow-[var(--shadow-elevated)]",
                  )}
                  aria-label={`Open ${date.toLocaleDateString()} — ${list.length} ${list.length === 1 ? "event" : "events"}`}
                >
                  <div className={cn("mb-1 flex items-center justify-between text-[10px] font-medium", inMonth ? "text-foreground" : "text-muted-foreground")}>
                    <span>{date.getDate()}</span>
                    {list.length > 0 && (
                      <span className="rounded-full bg-muted px-1.5 py-0 text-[9px] tabular-nums text-muted-foreground">
                        {list.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((e) => (
                      <Link
                        key={`${e.kind}-${e.id}`}
                        to={e.href}
                        onClick={(ev) => ev.stopPropagation()}
                        className={cn(
                          "block truncate rounded border px-1.5 py-0.5 text-[10px]",
                          KIND_TONE[e.kind],
                        )}
                        title={e.name}
                      >
                        {e.name}
                      </Link>
                    ))}
                    {list.length > 3 && (
                      <div className="text-[9px] text-muted-foreground">+{list.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <CalendarDaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDay}
        events={sheetEvents}
        onQuickAdd={(kind, name, date) => quickAdd.mutate({ kind, name, date })}
      />
    </div>
  );
}
