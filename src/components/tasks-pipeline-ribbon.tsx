import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Sparkles, Inbox, ListChecks, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Counts {
  capture: number;
  queue: number;
  open: number;
  blocked: number;
  doneThisWeek: number;
}

/**
 * Tiny pipeline ribbon — Capture → Queue → Tasks(open/blocked) → Done this week.
 * Surfaces the funnel that already exists so the Tasks page no longer feels orphaned.
 * See `mem://design/tasks-as-workbench.md`.
 */
export function TasksPipelineRibbon() {
  const { data } = useQuery<Counts>({
    queryKey: ["tasks-pipeline-counts"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [cap, queue, open, blocked, done] = await Promise.all([
        sb.from("capture_attachments").select("id", { count: "exact", head: true }),
        sb.from("proposals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        sb
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(Done,Complete,Completed,Cancelled,Canceled,Archived)"),
        sb.from("tasks").select("id", { count: "exact", head: true }).eq("blocked", true),
        sb
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .in("status", ["Done", "Complete", "Completed"])
          .gte("updated_at", sevenDaysAgo),
      ]);
      return {
        capture: cap.count ?? 0,
        queue: queue.count ?? 0,
        open: open.count ?? 0,
        blocked: blocked.count ?? 0,
        doneThisWeek: done.count ?? 0,
      };
    },
  });

  const segments = [
    {
      to: "/capture" as const,
      icon: Sparkles,
      label: "Capture",
      value: data?.capture ?? 0,
      tone: "text-[color:var(--iris-violet)]",
    },
    {
      to: "/queue" as const,
      icon: Inbox,
      label: "Queue",
      value: data?.queue ?? 0,
      tone: "text-amber-500",
    },
    {
      to: "/tasks" as const,
      icon: ListChecks,
      label: `Tasks · open ${data?.open ?? 0}${data?.blocked ? ` · blocked ${data.blocked}` : ""}`,
      value: data?.open ?? 0,
      tone: "text-foreground",
      noCount: true,
    },
    {
      to: "/tasks" as const,
      icon: CheckCircle2,
      label: "Done this week",
      value: data?.doneThisWeek ?? 0,
      tone: "text-emerald-500",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface px-2 py-1.5 text-xs">
      {segments.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex items-center gap-1">
            <Link
              to={s.to}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted"
            >
              <Icon className={cn("h-3 w-3", s.tone)} />
              <span className="font-medium">{s.label}</span>
              {!s.noCount && (
                <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] font-semibold tabular-nums">
                  {s.value}
                </span>
              )}
            </Link>
            {i < segments.length - 1 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            )}
          </div>
        );
      })}
    </div>
  );
}
