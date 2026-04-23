import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, GitFork, Gavel, Zap, ArrowRight } from "lucide-react";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";

/**
 * OCDA position — `/start` cockpit block.
 * Shows where you are in the Observe → Choose → Decide → Act loop right now,
 * with a count per stage. Links to the OCDA Cockpit for the full board.
 */
type Stage = "observe" | "choose" | "decide" | "act";

const STAGES: { key: Stage; label: string; icon: typeof Eye; tone: string; caption: string }[] = [
  {
    key: "observe",
    label: "Observe",
    icon: Eye,
    tone: "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-700 dark:text-sky-300",
    caption: "Signals · proposals · sparks",
  },
  {
    key: "choose",
    label: "Choose",
    icon: GitFork,
    tone:
      "from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-300",
    caption: "Options · trade-offs",
  },
  {
    key: "decide",
    label: "Decide",
    icon: Gavel,
    tone:
      "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    caption: "Logged decisions",
  },
  {
    key: "act",
    label: "Act",
    icon: Zap,
    tone: "from-iris/15 to-iris/5 border-iris/30 text-iris",
    caption: "Tasks in motion",
  },
];

export function OcdaPosition({ className }: { className?: string }) {
  const { data: counts } = useQuery({
    queryKey: ["start", "ocda-counts"],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [proposals, ktiFires, sparks, chooseTasks, decisions, actTasks] = await Promise.all([
        sb.from("proposals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        sb
          .from("kti_scans")
          .select("id", { count: "exact", head: true })
          .eq("fired", true)
          .gte("scanned_at", since24h),
        sb
          .from("sparks")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since24h),
        sb.from("tasks").select("id", { count: "exact", head: true }).eq("ocda_stage", "choose"),
        sb
          .from("decisions")
          .select("id", { count: "exact", head: true })
          .gte("date_made", since24h),
        sb
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .or("status.eq.Doing,status.eq.In Progress,ocda_stage.eq.act"),
      ]);
      return {
        observe: (proposals.count ?? 0) + (ktiFires.count ?? 0) + (sparks.count ?? 0),
        choose: chooseTasks.count ?? 0,
        decide: decisions.count ?? 0,
        act: actTasks.count ?? 0,
      };
    },
  });

  const total = counts ? counts.observe + counts.choose + counts.decide + counts.act : 0;

  return (
    <section className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Where you are in OCDA right now</h2>
          <p className="text-xs text-muted-foreground">
            The personal rhythm — where the loop is hot, where it's stalled.
          </p>
        </div>
        <Link
          to="/operate/ocda"
          className="inline-flex items-center gap-1 text-xs text-iris hover:underline"
        >
          Open OCDA Cockpit <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STAGES.map(({ key, label, icon: Icon, tone, caption }) => {
          const c = counts?.[key] ?? 0;
          return (
            <div
              key={key}
              className={cn(
                "flex flex-col gap-1 rounded-xl border bg-gradient-to-b p-3",
                tone,
              )}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4" />
                <span className="text-lg font-semibold tabular-nums">{c}</span>
              </div>
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">{caption}</div>
            </div>
          );
        })}
      </div>

      {total === 0 && (
        <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          Inbox zero — your Decision Factory is humming.{" "}
          <Link to="/sweetscan" className="text-iris hover:underline">
            Want to scan for what's coming? →
          </Link>
        </div>
      )}
    </section>
  );
}
