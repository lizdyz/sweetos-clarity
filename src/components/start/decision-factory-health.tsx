import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database, Cpu, FlaskConical, Network } from "lucide-react";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";

/**
 * Decision Factory · health — `/start` cockpit tile strip.
 * 4 tiles map 1:1 to the four canonical components in mem://design/decision-factory.md:
 *   01 Data pipeline · 02 Algorithms · 03 Experimentation · 04 Infrastructure
 * Each tile shows a live count + link to where that component is built.
 */
interface Tile {
  num: string;
  label: string;
  description: string;
  icon: typeof Database;
  to: string;
  toLabel: string;
  countKey: "data" | "algo" | "exp" | "infra";
}

const TILES: Tile[] = [
  {
    num: "01",
    label: "Data pipeline",
    description: "Gathers, cleans, integrates & safeguards data — systematic, sustainable, scalable.",
    icon: Database,
    to: "/sweetscan",
    toLabel: "SweetScan + Capture",
    countKey: "data",
  },
  {
    num: "02",
    label: "Algorithms",
    description: "Generates predictions of future states & actions — predictions, not reports.",
    icon: Cpu,
    to: "/library/ktis",
    toLabel: "KTIs + BizzyBots",
    countKey: "algo",
  },
  {
    num: "03",
    label: "Experimentation",
    description: "Hypotheses tested. Confirms whether a suggestion had its intended effect.",
    icon: FlaskConical,
    to: "/workflows",
    toLabel: "Workflows + Sessions",
    countKey: "exp",
  },
  {
    num: "04",
    label: "Infrastructure",
    description: "Embeds the process into software. Connects internal & external users — what makes it compound.",
    icon: Network,
    to: "/settings",
    toLabel: "The OS itself",
    countKey: "infra",
  },
];

export function DecisionFactoryHealth({ className }: { className?: string }) {
  const { data: counts } = useQuery({
    queryKey: ["start", "decision-factory-counts"],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [proposals, ktiFires, runs, operators] = await Promise.all([
        sb.from("proposals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        sb
          .from("kti_scans")
          .select("id", { count: "exact", head: true })
          .eq("fired", true)
          .gte("scanned_at", since24h),
        sb
          .from("workflow_runs")
          .select("id", { count: "exact", head: true })
          .in("status", ["running", "in_progress"]),
        sb.from("operators").select("id", { count: "exact", head: true }),
      ]);
      return {
        data: proposals.count ?? 0,
        algo: ktiFires.count ?? 0,
        exp: runs.count ?? 0,
        infra: operators.count ?? 0,
      };
    },
  });

  function caption(key: Tile["countKey"]): string {
    if (!counts) return "—";
    switch (key) {
      case "data":
        return `${counts.data} untriaged`;
      case "algo":
        return `${counts.algo} KTIs fired (24h)`;
      case "exp":
        return `${counts.exp} workflow run${counts.exp === 1 ? "" : "s"}`;
      case "infra":
        return `${counts.infra} operator${counts.infra === 1 ? "" : "s"} live`;
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border bg-gradient-to-br from-iris-soft/40 to-background p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Your Decision Factory · health right now
          </h2>
          <p className="text-xs text-muted-foreground">
            The four-component machine your business uses to make decisions in a systematic,
            sustainable, scalable way. Each tile links to where that component is built.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.num}
              to={t.to}
              className="group flex flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-sm transition-all hover:border-iris hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.num}
                </span>
                <Icon className="h-4 w-4 text-iris" />
              </div>
              <h3 className="text-sm font-semibold">{t.label}</h3>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {t.description}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="rounded-full bg-iris-soft px-2 py-0.5 text-[10px] font-medium text-iris">
                  {t.toLabel} →
                </span>
                <span className="text-[10px] text-muted-foreground">{caption(t.countKey)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
