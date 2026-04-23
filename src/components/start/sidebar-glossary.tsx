import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Sun, Hammer, Users, Library, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Glossary of rooms — `/start` cockpit block.
 * Mirrors the verb-first sidebar canon (mem://design/sidebar-ia.md). No regrouping.
 * Each card expands to surface the canon intent + the routes inside that group.
 */
interface Group {
  label: string;
  icon: LucideIcon;
  caption: string;
  canon: string;
  routes: { to: string; label: string }[];
}

const GROUPS: Group[] = [
  {
    label: "TODAY",
    icon: Sun,
    caption: "What am I doing right now?",
    canon:
      "The live working surface. /start orients you, /today is the daily decision surface, /calendar is the visual time grid, /capture is the inbox. Decision Factory role: Data pipeline + Algorithms outputs land here.",
    routes: [
      { to: "/start", label: "Start (this page)" },
      { to: "/today", label: "Today" },
      { to: "/calendar", label: "Calendar" },
      { to: "/capture", label: "Capture" },
    ],
  },
  {
    label: "WORK",
    icon: Hammer,
    caption: "Run the work · triage · decide",
    canon:
      "The OCDA loop made operational. /sandbox is Choose, /operate/ocda is the cockpit for the whole loop, /decisions is the Decide ledger, the rest are domain-specific Act surfaces. /sweetscan lives here because outside-in signal needs a triage destination.",
    routes: [
      { to: "/sandbox", label: "Sandbox" },
      { to: "/operate/ocda", label: "OCDA Cockpit" },
      { to: "/flightdeck", label: "Flightdeck" },
      { to: "/sweetcycle", label: "SweetCycle" },
      { to: "/sessions", label: "Sessions Bank" },
      { to: "/sweetscan", label: "SweetScan" },
      { to: "/decisions", label: "Decisions" },
      { to: "/measures", label: "Measures" },
    ],
  },
  {
    label: "PEOPLE",
    icon: Users,
    caption: "Operators, relationships, projects",
    canon:
      "Everything that has agency or receives work. Operators first because that's the unit-of-work canon — humans + workflows + AI agents share one table. Then the relationship anchor, then everything that hangs off it (projects, tasks, missions, journeys, quests, sparks).",
    routes: [
      { to: "/operators", label: "Operators" },
      { to: "/relationships", label: "Relationships" },
      { to: "/projects", label: "Projects" },
      { to: "/tasks", label: "Tasks" },
      { to: "/missions", label: "Missions" },
      { to: "/journeys", label: "Journeys" },
      { to: "/quests", label: "Quests" },
      { to: "/sparks", label: "Sparks" },
    ],
  },
  {
    label: "LIBRARY",
    icon: Library,
    caption: "Definitions · what CAN be done",
    canon:
      "The Truth model. Catalogs, templates, taxonomies. Read-mostly — these define what's possible; the WORK group runs instances of these definitions. Hard rule: never duplicate Library content into WORK.",
    routes: [
      { to: "/bizzybots", label: "BizzyBots" },
      { to: "/workflows", label: "Workflows" },
      { to: "/components", label: "Components" },
      { to: "/playbooks", label: "Playbooks" },
      { to: "/library/ktis", label: "KTIs" },
      { to: "/library/jtbd", label: "JTBD" },
      { to: "/vault", label: "Vault" },
      { to: "/domains", label: "Domains" },
    ],
  },
  {
    label: "SETTINGS",
    icon: Settings,
    caption: "Rubrics, prompts, team",
    canon:
      "The Infrastructure component made editable. Canon files, AI prompts, excellence rubrics, the team. Touched rarely — every edit propagates everywhere.",
    routes: [
      { to: "/settings/canon", label: "Entity Canon" },
      { to: "/settings/lens-canon", label: "Lens Canon" },
      { to: "/settings/prompts", label: "Prompt Console" },
      { to: "/settings/excellence", label: "Excellence rubric" },
      { to: "/settings", label: "Team & profile" },
    ],
  },
];

export function SidebarGlossary({ className }: { className?: string }) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  return (
    <section className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Glossary of rooms</h2>
        <p className="text-xs text-muted-foreground">
          The verb-first sidebar — what each group is for. Hand this to anyone.
        </p>
      </div>

      <div className="space-y-2">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const open = openMap[g.label] ?? false;
          return (
            <div key={g.label} className="rounded-xl border bg-background/60">
              <button
                type="button"
                onClick={() => setOpenMap((m) => ({ ...m, [g.label]: !open }))}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 text-iris" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{g.label}</div>
                    <div className="text-[11px] text-muted-foreground">{g.caption}</div>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open && (
                <div className="border-t px-3 py-2.5">
                  <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{g.canon}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.routes.map((r) => (
                      <Link
                        key={r.to}
                        to={r.to}
                        className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-foreground hover:border-iris hover:text-iris"
                      >
                        {r.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
