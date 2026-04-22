import { cn } from "@/lib/utils";

export type CalendarZoom = "day" | "week" | "month";

interface Props {
  zoom: CalendarZoom;
  onChange: (z: CalendarZoom) => void;
}

export function CalendarZoomToggle({ zoom, onChange }: Props) {
  const opts: { value: CalendarZoom; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-surface p-0.5">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
            zoom === o.value
              ? "bg-iris/15 text-[color:var(--iris-violet)] shadow-[var(--shadow-glass)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
