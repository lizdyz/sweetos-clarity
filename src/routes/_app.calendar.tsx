import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

interface Event {
  id: string;
  kind: "task" | "session" | "campaign";
  name: string;
  date: string; // YYYY-MM-DD
  href: string;
}

const KIND_TONE: Record<Event["kind"], string> = {
  task: "bg-iris/15 text-[color:var(--iris-violet)] border-iris/30",
  session: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  campaign: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x;
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthStart = startOfMonth(cursor);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const rangeStart = fmt(monthStart);
  const rangeEnd = fmt(monthEnd);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar", rangeStart, rangeEnd],
    queryFn: async () => {
      const [taskRes, sessionRes, campaignRes] = await Promise.all([
        sb
          .from("tasks")
          .select("id, name, due_date, scheduled_for")
          .or(`due_date.gte.${rangeStart},scheduled_for.gte.${rangeStart}`)
          .or(`due_date.lte.${rangeEnd},scheduled_for.lte.${rangeEnd}`)
          .limit(500),
        sb
          .from("sessions")
          .select("id, name, session_date, scheduled_for")
          .or(`session_date.gte.${rangeStart},scheduled_for.gte.${rangeStart}`)
          .or(`session_date.lte.${rangeEnd},scheduled_for.lte.${rangeEnd}`)
          .limit(500),
        sb
          .from("campaigns")
          .select("id, campaign_name, deadline, scheduled_for")
          .or(`deadline.gte.${rangeStart},scheduled_for.gte.${rangeStart}`)
          .or(`deadline.lte.${rangeEnd},scheduled_for.lte.${rangeEnd}`)
          .limit(500),
      ]);
      const out: Event[] = [];
      for (const t of (taskRes.data ?? []) as Array<{ id: string; name: string; due_date: string | null; scheduled_for: string | null }>) {
        const d = t.scheduled_for ?? t.due_date;
        if (d) out.push({ id: t.id, kind: "task", name: t.name, date: d.slice(0, 10), href: `/tasks/${t.id}` });
      }
      for (const s of (sessionRes.data ?? []) as Array<{ id: string; name: string; session_date: string | null; scheduled_for: string | null }>) {
        const d = s.session_date ?? s.scheduled_for;
        if (d) out.push({ id: s.id, kind: "session", name: s.name, date: d.slice(0, 10), href: `/sessions/${s.id}` });
      }
      for (const c of (campaignRes.data ?? []) as Array<{ id: string; campaign_name: string; deadline: string | null; scheduled_for: string | null }>) {
        const d = c.scheduled_for ?? c.deadline;
        if (d) out.push({ id: c.id, kind: "campaign", name: c.campaign_name, date: d.slice(0, 10), href: `/campaigns/${c.id}` });
      }
      return out;
    },
  });

  const byDay = useMemo(() => {
    const m = new Map<string, Event[]>();
    events.forEach((e) => {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    });
    return m;
  }, [events]);

  // Build month grid (6 rows × 7 cols)
  const grid = useMemo(() => {
    const firstWeekday = (monthStart.getDay() + 6) % 7; // Mon=0
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

  return (
    <div className="px-6 py-6">
      <PageHeader
        icon={<CalIcon className="h-5 w-5" />}
        title="Calendar"
        purpose="Visual time view of everything with a date — tasks, sessions, and campaigns. Click a card to open it."
        whatYouCanDo={[
          "Navigate by month",
          "Color-coded by entity type",
          "Click to open the detail page",
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
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[96px] rounded-lg border p-1.5",
                    inMonth ? "border-border/60 bg-surface" : "border-border/30 bg-muted/20",
                    isToday && "ring-1 ring-iris/60",
                  )}
                >
                  <div className={cn("mb-1 text-[10px] font-medium", inMonth ? "text-foreground" : "text-muted-foreground")}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((e) => (
                      <Link
                        key={`${e.kind}-${e.id}`}
                        to={e.href}
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
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
