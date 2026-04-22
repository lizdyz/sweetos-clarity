import { Link } from "@tanstack/react-router";
import { Flame, Sparkles, FileText, Inbox, Workflow, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

export type SpawnedByKind =
  | "kti"
  | "spark"
  | "decision"
  | "capture"
  | "workflow"
  | "manual"
  | null
  | undefined;

const META: Record<
  Exclude<SpawnedByKind, null | undefined>,
  { label: string; icon: typeof Flame; tone: string; route?: string }
> = {
  kti: {
    label: "KTI fire",
    icon: Flame,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    route: "/library/ktis",
  },
  spark: {
    label: "Spark",
    icon: Sparkles,
    tone: "bg-iris-soft text-foreground border-border-strong",
    route: "/sparks",
  },
  decision: {
    label: "Decision",
    icon: FileText,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    route: "/decisions",
  },
  capture: {
    label: "Capture",
    icon: Inbox,
    tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    route: "/capture",
  },
  workflow: {
    label: "Workflow",
    icon: Workflow,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    route: "/workflows",
  },
  manual: {
    label: "Manual",
    icon: Hand,
    tone: "bg-muted text-muted-foreground border-border",
  },
};

/**
 * Provenance chip — answers "why does this task exist?"
 * See `mem://design/tasks-as-workbench.md`.
 */
export function TaskProvenanceChip({
  kind,
  id,
  className,
}: {
  kind: SpawnedByKind;
  id?: string | null;
  className?: string;
}) {
  if (!kind) return null;
  const meta = META[kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const cls = cn(
    "inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-medium leading-4",
    meta.tone,
    className,
  );
  const inner = (
    <>
      <Icon className="h-2.5 w-2.5" />
      <span>{meta.label}</span>
    </>
  );

  if (id && meta.route) {
    return (
      <Link
        to={`${meta.route}/$id` as "/library/ktis/$id"}
        params={{ id }}
        className={cn(cls, "hover:opacity-80")}
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    );
  }
  return <span className={cls}>{inner}</span>;
}
