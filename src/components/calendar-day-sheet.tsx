import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  kind: "task" | "session" | "campaign" | "decision";
  name: string;
  date: string;
  href: string;
  status?: string | null;
}

const KIND_TONE: Record<CalendarEvent["kind"], string> = {
  task: "bg-iris/15 text-[color:var(--iris-violet)] border-iris/30",
  session: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  campaign: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  decision: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  events: CalendarEvent[];
  onQuickAdd: (kind: "task" | "session" | "decision", name: string, date: string) => void;
}

export function CalendarDaySheet({ open, onOpenChange, date, events, onQuickAdd }: Props) {
  const label = date ? new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>
            {events.length} {events.length === 1 ? "event" : "events"} this day
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {events.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              Nothing scheduled. Add something below.
            </div>
          )}
          {events.map((e) => (
            <div
              key={`${e.kind}-${e.id}`}
              className={cn("flex items-center gap-2 rounded-lg border bg-surface p-2 text-xs", KIND_TONE[e.kind])}
            >
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                {e.kind}
              </Badge>
              <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
              {e.status && <span className="text-[10px] opacity-70">· {e.status}</span>}
              <Link to={e.href} className="opacity-70 hover:opacity-100" title="Open">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {date && (
          <div className="mt-6 space-y-2 border-t border-border/60 pt-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Quick add to {label}
            </div>
            <QuickAddRow date={date} onAdd={onQuickAdd} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function QuickAddRow({
  date,
  onAdd,
}: {
  date: string;
  onAdd: (kind: "task" | "session" | "decision", name: string, date: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(["task", "session", "decision"] as const).map((k) => (
        <Button
          key={k}
          size="sm"
          variant="outline"
          className="h-8 capitalize text-xs"
          onClick={() => {
            const name = window.prompt(`Quick ${k} title for ${date}`);
            if (name && name.trim()) onAdd(k, name.trim(), date);
          }}
        >
          <Plus className="mr-1 h-3 w-3" /> {k}
        </Button>
      ))}
    </div>
  );
}
