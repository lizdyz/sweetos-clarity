import { cn } from "@/lib/utils";

export type ComponentKind = "user" | "platform" | "internal";

const labels: Record<ComponentKind, { label: string; hint: string }> = {
  user: { label: "User components", hint: "What every advisor business needs to build" },
  platform: { label: "Platform", hint: "SweetBOS product surface I'm building" },
  internal: { label: "Internal", hint: "Project-specific components" },
};

export function ComponentKindToggle({
  value,
  counts,
  onChange,
}: {
  value: ComponentKind;
  counts: Record<ComponentKind, number>;
  onChange: (k: ComponentKind) => void;
}) {
  const order: ComponentKind[] = ["user", "platform", "internal"];
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface/60 p-0.5 text-xs">
      {order.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          title={labels[k].hint}
          className={cn(
            "rounded-lg px-3 py-1 font-medium transition-colors inline-flex items-center gap-1.5",
            value === k
              ? "bg-iris text-white shadow-[var(--shadow-glow)]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span>{labels[k].label}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-px text-[10px] tabular-nums",
              value === k ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
            )}
          >
            {counts[k] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
