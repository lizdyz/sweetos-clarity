import { cn } from "@/lib/utils";
import { ClipboardList, Users, Hand, Workflow } from "lucide-react";

interface Props {
  source: "quest" | "session" | "manual" | "workflow" | string | null | undefined;
  className?: string;
}

/**
 * Shows where a Deliverable came from. Per Wave 6 reconciliation issue #2:
 * a Quest produces exactly 1 Deliverable, but Sessions and Workflows can
 * produce many. The chip makes the source visible everywhere.
 */
export function DeliverableSourceChip({ source, className }: Props) {
  if (!source) return null;
  const cfg: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string; title: string }> = {
    quest: {
      label: "From Quest",
      icon: ClipboardList,
      tone: "border-[color:var(--iris-violet)]/30 bg-iris-soft/40 text-[color:var(--iris-violet)]",
      title: "Produced as the single deliverable of a Quest",
    },
    session: {
      label: "From Session",
      icon: Users,
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      title: "Produced inside a Map/Machine session",
    },
    workflow: {
      label: "From Workflow",
      icon: Workflow,
      tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
      title: "Produced by a Workflow run",
    },
    manual: {
      label: "Manual",
      icon: Hand,
      tone: "border-border bg-muted text-muted-foreground",
      title: "Created by hand outside any quest/session/workflow",
    },
  };
  const c = cfg[source] ?? cfg.manual;
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        c.tone,
        className,
      )}
      title={c.title}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}
