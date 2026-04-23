import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, type AuditCategory } from "@/lib/audit";

const TONE: Record<AuditCategory, string> = {
  data_change: "bg-muted text-muted-foreground",
  lifecycle: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  tag_change: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  relationship_change: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  import: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  schema: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  recipe: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  workflow: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  prompt: "bg-iris-soft/60 text-[color:var(--iris-violet)]",
  review: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  exception: "bg-red-500/15 text-red-700 dark:text-red-400",
  auth: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

export function EventCategoryChip({
  category,
  onClick,
  className,
}: {
  category: AuditCategory;
  onClick?: () => void;
  className?: string;
}) {
  const Cmp = onClick ? "button" : "span";
  return (
    <Cmp
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-medium",
        TONE[category],
        onClick && "cursor-pointer hover:ring-1 hover:ring-iris/40",
        className,
      )}
    >
      {CATEGORY_LABEL[category]}
    </Cmp>
  );
}
