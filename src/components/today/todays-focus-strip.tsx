// Top-of-Today strip: surfaces the active Quest, the active Project, and any
// blocked Decisions so the operator knows the higher context before diving
// into individual tasks.
//
// Selection rules (no schema changes — just smart picks from existing tables):
//   • Today's Quest    → most recently updated quest with progression_state
//                        in 'In Progress' or 'Started' (fallback: most recent).
//   • Today's Project  → most recently updated project with status 'Active'
//                        (fallback: most recent).
//   • Blocked Decisions → decisions with status='open' or 'pending'.
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Compass, FolderKanban, Diamond, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestRow {
  id: string;
  name: string;
  progression_state: string | null;
  journey_id: string | null;
}
interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  next_action: string | null;
}
interface DecisionRow {
  id: string;
  decision: string;
  status: string | null;
}

export function TodaysFocusStrip() {
  const { data: quest } = useQuery<QuestRow | null>({
    queryKey: ["todays-focus", "quest"],
    queryFn: async () => {
      const { data } = await sb
        .from("quests")
        .select("id, name, progression_state, journey_id")
        .in("progression_state", ["In Progress", "Started"])
        .order("updated_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) return data[0] as QuestRow;
      const { data: fallback } = await sb
        .from("quests")
        .select("id, name, progression_state, journey_id")
        .order("updated_at", { ascending: false })
        .limit(1);
      return (fallback?.[0] as QuestRow) ?? null;
    },
  });

  const { data: project } = useQuery<ProjectRow | null>({
    queryKey: ["todays-focus", "project"],
    queryFn: async () => {
      const { data } = await sb
        .from("projects")
        .select("id, name, status, next_action")
        .eq("status", "Active")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) return data[0] as ProjectRow;
      const { data: fallback } = await sb
        .from("projects")
        .select("id, name, status, next_action")
        .order("updated_at", { ascending: false })
        .limit(1);
      return (fallback?.[0] as ProjectRow) ?? null;
    },
  });

  const { data: blockedDecisions = [] } = useQuery<DecisionRow[]>({
    queryKey: ["todays-focus", "blocked-decisions"],
    queryFn: async () => {
      const { data } = await sb
        .from("decisions")
        .select("id, decision, status")
        .in("status", ["open", "pending", "Open", "Pending"])
        .order("updated_at", { ascending: false })
        .limit(5);
      return (data ?? []) as DecisionRow[];
    },
  });

  return (
    <section className="mb-4 grid gap-3 lg:grid-cols-3">
      <FocusCard
        icon={<Compass className="h-3.5 w-3.5" />}
        eyebrow="Today's Quest"
        primary={quest?.name ?? "No active quest"}
        secondary={quest?.progression_state ?? "Open Planning to seed one"}
        href={quest ? `/quests/${quest.id}` : "/planning"}
        tone="violet"
      />
      <FocusCard
        icon={<FolderKanban className="h-3.5 w-3.5" />}
        eyebrow="Today's Project"
        primary={project?.name ?? "No active project"}
        secondary={project?.next_action ?? project?.status ?? "Open Planning to seed one"}
        href={project ? `/projects/${project.id}` : "/planning"}
        tone="emerald"
      />
      <FocusCard
        icon={<Diamond className="h-3.5 w-3.5" />}
        eyebrow="Blocked decisions"
        primary={
          blockedDecisions.length === 0
            ? "Nothing blocked"
            : `${blockedDecisions.length} open ${blockedDecisions.length === 1 ? "decision" : "decisions"}`
        }
        secondary={blockedDecisions[0]?.decision ?? "All clear — keep shipping."}
        href="/decisions/open"
        tone={blockedDecisions.length > 0 ? "rose" : "muted"}
      />
    </section>
  );
}

function FocusCard({
  icon,
  eyebrow,
  primary,
  secondary,
  href,
  tone,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  primary: string;
  secondary: string;
  href: string;
  tone: "violet" | "emerald" | "rose" | "muted";
}) {
  const toneRing =
    tone === "violet"
      ? "ring-[color:var(--iris-violet)]/30 bg-iris-soft/30"
      : tone === "emerald"
        ? "ring-emerald-400/30 bg-emerald-50/40 dark:bg-emerald-950/20"
        : tone === "rose"
          ? "ring-rose-400/40 bg-rose-50/40 dark:bg-rose-950/20"
          : "ring-border/60 bg-muted/30";
  const toneText =
    tone === "violet"
      ? "text-[color:var(--iris-violet)]"
      : tone === "emerald"
        ? "text-emerald-700 dark:text-emerald-400"
        : tone === "rose"
          ? "text-rose-700 dark:text-rose-400"
          : "text-muted-foreground";
  return (
    <Link
      to={href}
      className={cn(
        "group flex items-start justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3 ring-1 ring-inset transition-all hover:shadow-[var(--shadow-glass)]",
        toneRing,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className={cn("mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]", toneText)}>
          {icon}
          {eyebrow}
        </div>
        <div className="truncate text-sm font-semibold leading-tight">{primary}</div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{secondary}</div>
      </div>
      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
