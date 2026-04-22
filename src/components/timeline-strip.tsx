import { Calendar, CalendarClock, CheckCircle2, Lock, Play, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimelineStripProps {
  createdAt?: string | null;
  startedAt?: string | null;
  scheduledFor?: string | null;
  notBefore?: string | null;
  dueAt?: string | null;
  doneAt?: string | null;
  onChangeStarted?: (v: string | null) => void;
  onChangeScheduled?: (v: string | null) => void;
  onChangeNotBefore?: (v: string | null) => void;
  onChangeDue?: (v: string | null) => void;
  onChangeDone?: (v: string | null) => void;
  className?: string;
}

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatNice(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function TimelineStrip({
  createdAt,
  startedAt,
  scheduledFor,
  notBefore,
  dueAt,
  doneAt,
  onChangeStarted,
  onChangeScheduled,
  onChangeNotBefore,
  onChangeDue,
  onChangeDone,
  className,
}: TimelineStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-2 rounded-xl border border-border/50 bg-card/40 p-2",
        className,
      )}
    >
      <Cell icon={<Sparkles className="h-3 w-3" />} label="Created" value={formatNice(createdAt)} readOnly />
      <Cell
        icon={<Play className="h-3 w-3" />}
        label="Started"
        value={startedAt}
        editable={!!onChangeStarted}
        onChange={onChangeStarted}
      />
      <Cell
        icon={<Lock className="h-3 w-3" />}
        label="Not before"
        value={notBefore}
        editable={!!onChangeNotBefore}
        onChange={onChangeNotBefore}
      />
      <Cell
        icon={<CalendarClock className="h-3 w-3" />}
        label="Scheduled"
        value={scheduledFor}
        editable={!!onChangeScheduled}
        onChange={onChangeScheduled}
      />
      <Cell
        icon={<Calendar className="h-3 w-3" />}
        label="Due"
        value={dueAt}
        editable={!!onChangeDue}
        onChange={onChangeDue}
      />
      <Cell
        icon={<CheckCircle2 className="h-3 w-3" />}
        label="Done"
        value={doneAt}
        editable={!!onChangeDone}
        onChange={onChangeDone}
      />
    </div>
  );
}

function Cell({
  icon,
  label,
  value,
  readOnly,
  editable,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  readOnly?: boolean;
  editable?: boolean;
  onChange?: (v: string | null) => void;
}) {
  return (
    <div className="flex min-w-[120px] flex-1 flex-col gap-1 rounded-lg border border-border/40 bg-background px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      {readOnly || !editable ? (
        <div className="text-xs font-medium">
          {value ? (typeof value === "string" && value.length > 10 ? formatNice(value) : value) : "—"}
        </div>
      ) : (
        <Input
          type="date"
          value={dateInputValue(value)}
          onChange={(e) => onChange?.(e.target.value || null)}
          className="h-6 border-0 p-0 text-xs focus-visible:ring-0"
        />
      )}
    </div>
  );
}

function formatNiceLocal(iso: string): string {
  return formatNice(iso);
}
// Re-export for callers that want pretty formatting elsewhere.
export { formatNiceLocal as formatTimelineDate };
