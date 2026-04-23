import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Compass, ArrowRight } from "lucide-react";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";

/**
 * Two paths — `/start` cockpit block.
 * Surfaces the canon from mem://design/two-progression-paths.md side-by-side.
 *   Session path:  Evidence → Judgment → Decision  (advisor-led, in Sessions)
 *   SweetSync path: Mission → Journey → Quest → Spark  (client-led, between sessions)
 * Both write to one truth model.
 */
export function TwoPathsExplainer({ className }: { className?: string }) {
  const { data: sessionToday } = useQuery({
    queryKey: ["start", "session-today"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const { data } = await sb
        .from("sessions")
        .select("id, name, scheduled_for")
        .gte("scheduled_for", start.toISOString())
        .lte("scheduled_for", end.toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(1);
      return (data?.[0] ?? null) as { id: string; name: string | null; scheduled_for: string } | null;
    },
  });

  const { data: questCount } = useQuery({
    queryKey: ["start", "active-quests"],
    queryFn: async () => {
      const { count } = await sb
        .from("quests")
        .select("id", { count: "exact", head: true })
        .neq("status", "Completed");
      return count ?? 0;
    },
  });

  return (
    <section className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">The two paths your work takes</h2>
        <p className="text-xs text-muted-foreground">
          Both write to the same truth model. Pick the rhythm that matches the moment.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Session path */}
        <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-background p-3">
          <div className="mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Session path</h3>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Evidence → Judgment → Decision. Linear, advisor-led. Carried by SweetCycle stages
            (Seed → Synthesize → Session → Sync → Ship).
          </p>
          <div className="mt-3 space-y-1.5 text-xs">
            {sessionToday ? (
              <Link
                to="/sessions/$id"
                params={{ id: sessionToday.id }}
                className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5 hover:bg-background"
              >
                <span className="truncate">
                  → Today's session: <span className="font-medium">{sessionToday.name ?? "Untitled"}</span>
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              </Link>
            ) : (
              <div className="rounded-md bg-background/60 px-2 py-1.5 text-muted-foreground">
                No session scheduled today.
              </div>
            )}
            <Link
              to="/sessions"
              className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5 hover:bg-background"
            >
              <span>→ Sessions Bank</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              to="/sweetcycle"
              className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5 hover:bg-background"
            >
              <span>→ SweetCycle board</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* SweetSync path */}
        <div className="rounded-xl border bg-gradient-to-br from-iris-soft/40 to-background p-3">
          <div className="mb-2 flex items-center gap-2">
            <Compass className="h-4 w-4 text-iris" />
            <h3 className="text-sm font-semibold">SweetSync path</h3>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Mission → Journey → Quest → Spark. Self-paced, client-led between sessions. A Mission
            can be top-down or emerge from accumulated Spark evidence.
          </p>
          <div className="mt-3 space-y-1.5 text-xs">
            <Link
              to="/missions"
              className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5 hover:bg-background"
            >
              <span>→ Missions</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              to="/quests"
              className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5 hover:bg-background"
            >
              <span>
                → {questCount ?? 0} active quest{questCount === 1 ? "" : "s"}
              </span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              to="/sparks"
              className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5 hover:bg-background"
            >
              <span>→ Sparks (atomic interactions)</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
