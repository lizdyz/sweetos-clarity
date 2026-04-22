import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CalendarMarker {
  date: string; // YYYY-MM-DD
  kind: "due" | "scheduled" | "done";
  count?: number;
}

interface MiniCalendarProps {
  markers?: CalendarMarker[];
  onDayClick?: (iso: string) => void;
  className?: string;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function MiniCalendar({ markers = [], onDayClick, className }: MiniCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const arr: Array<{ iso: string | null; day: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) arr.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      arr.push({ iso: iso(date), day: d });
    }
    return arr;
  }, [cursor]);

  const markersByDay = useMemo(() => {
    const m = new Map<string, { due: number; scheduled: number; done: number }>();
    for (const mk of markers) {
      const cur = m.get(mk.date) ?? { due: 0, scheduled: 0, done: 0 };
      cur[mk.kind] += mk.count ?? 1;
      m.set(mk.date, cur);
    }
    return m;
  }, [markers]);

  const today = iso(new Date());
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/50 p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCursor((c) => addMonths(c, -1))}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCursor(startOfMonth(new Date()))}>
            <span className="text-[10px]">Today</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="px-1 py-0.5 text-center">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.iso) return <div key={i} className="aspect-square" />;
          const m = markersByDay.get(cell.iso);
          const isToday = cell.iso === today;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick?.(cell.iso!)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-start rounded-md border border-transparent p-1 text-[11px] hover:border-border",
                isToday && "border-primary/60 bg-primary/5 font-semibold",
              )}
            >
              <span>{cell.day}</span>
              {m && (
                <div className="mt-auto flex items-center gap-0.5">
                  {m.due > 0 && <span className="h-1 w-1 rounded-full bg-rose-500" title={`${m.due} due`} />}
                  {m.scheduled > 0 && <span className="h-1 w-1 rounded-full bg-sky-500" title={`${m.scheduled} scheduled`} />}
                  {m.done > 0 && <span className="h-1 w-1 rounded-full bg-emerald-500" title={`${m.done} done`} />}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Due</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Scheduled</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Done</span>
      </div>
    </div>
  );
}
