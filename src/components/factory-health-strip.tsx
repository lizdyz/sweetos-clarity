import { Link } from "@tanstack/react-router";
import { Database, Cpu, FlaskConical, Network } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComponentTile {
  num: string;
  label: string;
  description: string;
  icon: typeof Database;
  to: string;
  toLabel: string;
}

const COMPONENTS: ComponentTile[] = [
  {
    num: "01",
    label: "Data pipeline",
    description: "Gathers, cleans, integrates & safeguards data — systematic, sustainable, scalable.",
    icon: Database,
    to: "/sweetscan",
    toLabel: "SweetScan + Capture",
  },
  {
    num: "02",
    label: "Algorithms",
    description: "Generates predictions of future states & actions — predictions, not reports.",
    icon: Cpu,
    to: "/library/ktis",
    toLabel: "KTIs + BizzyBots",
  },
  {
    num: "03",
    label: "Experimentation",
    description: "Hypotheses tested. Confirms whether a suggestion had its intended effect.",
    icon: FlaskConical,
    to: "/workflows",
    toLabel: "Workflows + Sessions",
  },
  {
    num: "04",
    label: "Infrastructure",
    description: "Embeds the process into software. Connects internal & external users — what makes it compound.",
    icon: Network,
    to: "/settings",
    toLabel: "The OS itself",
  },
];

export function FactoryHealthStrip({ className }: { className?: string }) {
  return (
    <section className={cn("mb-6 rounded-2xl border bg-gradient-to-br from-iris-soft/40 to-background p-4", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Decision Factory · health</h2>
          <p className="text-xs text-muted-foreground">
            The four-component machine OCDA makes personal. Each tile links to where that component is built.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COMPONENTS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.num}
              to={c.to}
              className="group flex flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-sm transition-all hover:border-iris hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {c.num}
                </span>
                <Icon className="h-4 w-4 text-iris" />
              </div>
              <h3 className="text-sm font-semibold">{c.label}</h3>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{c.description}</p>
              <span className="mt-1 inline-flex w-fit rounded-full bg-iris-soft px-2 py-0.5 text-[10px] font-medium text-iris">
                {c.toLabel} →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
