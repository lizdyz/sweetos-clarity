import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HelpCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface GlossaryEntry {
  to?: string;
  title: string;
  purpose: string;
  group: string;
  source: string;
}

const GLOSSARY: GlossaryEntry[] = [
  // SweetSync (client-facing, system-generated)
  { to: "/missions", title: "Missions", purpose: "The overarching transformation goal. One active per client. Activates Journeys.", group: "SweetSync", source: "Canon §6" },
  { to: "/journeys", title: "Journeys", purpose: "Capability areas that contain Quests and Components.", group: "SweetSync", source: "Canon §7" },
  { to: "/quests", title: "Quests", purpose: "Structured work units that group Sparks and advance Components, producing a Deliverable.", group: "SweetSync", source: "Canon §8" },
  { to: "/sparks", title: "Sparks", purpose: "Atomic interactions the system generates — Question, Creation, Definition, Decision, Reflection, Action — to advance a Component. Never created by humans.", group: "SweetSync", source: "Canon §9" },
  { to: "/domain-assessments", title: "Domain Assessments", purpose: "Maturity scoring sessions across the 22 Domains.", group: "SweetSync", source: "Canon §11" },

  // Library (definitions)
  { to: "/workflows", title: "Workflows", purpose: "The underlying things being made real. Stored, versioned, reusable. Capabilities are derived from these.", group: "Library", source: "Canon §3" },
  { to: "/components", title: "Components", purpose: "Concrete building blocks being matured (e.g. 'Service Tiers'). Have maturity levels. Advanced through Quests, Sessions, and Tasks.", group: "Library", source: "Canon §4" },
  { to: "/session-templates", title: "Session Templates", purpose: "Mirror / Machine / Map / Sync — the canonical session shapes.", group: "Library", source: "Canon §10" },
  { to: "/playbooks", title: "Playbooks", purpose: "How a service runs end-to-end. Compose Workflows + Session Templates.", group: "Library", source: "Canon §10" },
  { to: "/personas", title: "Personas", purpose: "Buyer archetypes — who we serve.", group: "Library", source: "Canon §5" },
  { to: "/outcomes", title: "Outcomes", purpose: "Measurable business results. Six types: Time Saved, Revenue Increased, Efficiency Gained, Satisfaction Improved, Cost Reduced, Quality Improved.", group: "Library", source: "Canon §12" },

  // Operate (operator side)
  { to: "/flightdeck", title: "Flightdeck", purpose: "Cross-relationship cockpit. See every active engagement at once.", group: "Operate", source: "Canon §2" },
  { to: "/sweetcycle", title: "SweetCycle", purpose: "Per-client journey through Seed → Synthesize → Session → Sync → Ship.", group: "Operate", source: "Canon §2" },
  { to: "/sessions", title: "Sessions", purpose: "Scheduled working sessions. Each instantiates a Session Template.", group: "Operate", source: "Canon §10" },
  { to: "/engagement-plans", title: "Engagement Plans", purpose: "The contract shape for one relationship over time. Bundles services, roadmap, revenue, expected sessions.", group: "Operate", source: "Canon §6" },
  { to: "/measures", title: "Measures", purpose: "Objectives, KRs, KPIs, CSFs. Polymorphic — attaches to any subject.", group: "Operate", source: "Canon §14" },
  { to: "/decisions", title: "Decisions", purpose: "Logged choices and rationale. Provenance for the system.", group: "Operate", source: "Canon §15" },
  { to: "/documents", title: "Documents", purpose: "Briefs, deliverables, assets.", group: "Operate", source: "Canon §10" },

  // Today (operator write surface)
  { to: "/today", title: "Today", purpose: "Live working surface. Everything due, scheduled, or active right now. Includes My Tasks and Planner views.", group: "Today", source: "App canon" },
  { to: "/calendar", title: "Calendar", purpose: "Visual time view across every actionable record.", group: "Today", source: "App canon" },
  { to: "/capture", title: "Capture", purpose: "Get raw input into the system fast — and review pending proposals before they become real records.", group: "Today", source: "App canon" },
  { to: "/tasks", title: "Tasks", purpose: "Atomic executable work. Created by you, an agent, or a workflow. Has a clear deliverable.", group: "Today", source: "Canon §9 Tasks" },

  // People & Relationships
  { to: "/relationships", title: "Relationships", purpose: "Companies and contacts you work with.", group: "People", source: "Canon §1" },
  { to: "/people", title: "People", purpose: "Individual contacts inside relationships.", group: "People", source: "Canon §1" },
  { to: "/operators", title: "Operators", purpose: "Unit-of-work model — humans, workflows, and AI agents share one table.", group: "People", source: "Canon §16" },
  { to: "/projects", title: "Projects", purpose: "Container for related Tasks aimed at one outcome.", group: "People", source: "App canon" },

  // Taxonomies
  { to: "/domains", title: "Domains", purpose: "22 universal areas of excellence — the lens taxonomy.", group: "Taxonomies", source: "Canon §11" },
  { to: "/tenets", title: "Tenets", purpose: "Industry-specific best-practice anchors inside each Domain.", group: "Taxonomies", source: "Canon §11" },

  // Settings
  { to: "/settings/excellence", title: "Excellence Rubric", purpose: "Define L1→L5 across the 5 Ps for each subject.", group: "Settings", source: "Canon §13" },
  { to: "/settings/lenses", title: "BizzyBot Prompts", purpose: "Edit AI instructions for each of the 8 Lenses (BizzyBots).", group: "Settings", source: "Canon §17" },
];

const GROUP_ORDER = ["Today", "Operate", "Library", "SweetSync", "People", "Taxonomies", "Settings"];

export function HelpSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    items: GLOSSARY.filter((x) => x.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-iris-soft/40 hover:text-foreground"
        title="Help & glossary (⌘K)"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span>Help</span>
        <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px] font-mono">⌘K</kbd>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Why each page exists</SheetTitle>
          </SheetHeader>
          <p className="mt-2 text-xs text-muted-foreground">
            Every page in SweetBOS maps to a concept from the canonical docs. Click any entry to jump.
          </p>
          <div className="mt-5 space-y-6">
            {grouped.map(({ group, items }) => (
              <section key={group}>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((it) => (
                    <li key={it.title}>
                      {it.to ? (
                        <Link
                          to={it.to}
                          onClick={() => setOpen(false)}
                          className="block rounded-xl border border-border bg-surface/60 p-3 transition-colors hover:bg-iris-soft/40"
                        >
                          <GlossaryRow item={it} />
                        </Link>
                      ) : (
                        <div className="rounded-xl border border-border bg-surface/60 p-3">
                          <GlossaryRow item={it} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function GlossaryRow({ item }: { item: GlossaryEntry }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tracking-tight">{item.title}</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {item.source}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.purpose}</p>
    </>
  );
}
