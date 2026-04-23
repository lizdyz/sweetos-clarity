import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Workflow,
  Compass,
  Settings,
  ChevronDown,
  Gauge,
  Map,
  Bot,
  Calendar,
  Layers,
  Megaphone,
  Library as LibraryIcon,
  Target,
  ListChecks,
  FileText,
  GitBranch,
  Send,
  Brain,
  Wand2,
  Vault,
  Radar,
  Target as TargetIcon,
  BookOpen,
  FlaskConical,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
}

interface NavGroup {
  label: string;
  caption: string;
  items: NavItem[];
  collapsible?: boolean;
}

/**
 * Canonical IA — Verb-first, stripped to 3 always-open + 3 collapsed groups.
 *   TODAY · WORK · PEOPLE  +  Library · Settings (collapsed by default).
 * 5 Ps stay as a framework overlay (Sandbox, Relationship health), not a shelf.
 * See `mem://design/sidebar-ia.md`.
 */
export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    label: "Today",
    caption: "Live working surface",
    items: [
      { to: "/start", label: "Start", icon: Compass, hint: "Where do I start? · Decision Factory · OCDA · Two Paths" },
      { to: "/today", label: "Today", icon: LayoutDashboard, hint: "Live working surface · my tasks · planner" },
      { to: "/calendar", label: "Calendar", icon: Calendar, hint: "Visual time view" },
      { to: "/capture", label: "Capture", icon: Sparkles, hint: "In — drop multi-node thoughts; auto-pollinates entities, save ideas to Sandbox" },
      { to: "/import", label: "Import", icon: Inbox, hint: "Bulk ingestion — drop a folder of files, we group, classify, and propose where each one belongs" },
    ],
  },
  {
    label: "Work",
    caption: "Run the work · triage · decide",
    items: [
      { to: "/sandbox", label: "Sandbox", icon: FlaskConical, hint: "Frame & route — triage raw ideas, run framework lenses, promote to work" },
      { to: "/operate/ocda", label: "OCDA Cockpit", icon: Brain, hint: "Observe · Choose · Decide · Act" },
      { to: "/flightdeck", label: "Flightdeck", icon: Map, hint: "Cross-relationship cockpit" },
      { to: "/sessions", label: "Sessions Bank", icon: Calendar, hint: "All Mirror / Map / Machine / Sync sessions" },
      { to: "/sweetscan", label: "SweetScan", icon: Radar, hint: "Outside-in intelligence — radar + signal inbox" },
      { to: "/engagement-plans", label: "Engagement Plans", icon: Send, hint: "Contract shape per relationship — contains the SweetCycle for each active engagement" },
      { to: "/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/decisions", label: "Decisions", icon: FileText, hint: "Logged choices & rationale" },
      { to: "/delegation", label: "Delegation Register", icon: GitBranch, hint: "Work to hand off — the systematize list" },
      { to: "/measures", label: "Measures", icon: Gauge, hint: "Objectives, KRs, KPIs, CSFs" },
    ],
  },
  {
    label: "People",
    caption: "Operators, relationships, projects",
    items: [
      { to: "/operators", label: "Operators", icon: Bot, hint: "Who does the work — humans · workflows · AI agents" },
      { to: "/relationships", label: "Relationships", icon: Users, hint: "Clients & key relationships (the orgs you work with)" },
      { to: "/people", label: "People", icon: Users, hint: "Contacts within those relationships" },
      { to: "/projects", label: "Projects", icon: Workflow },
      { to: "/tasks", label: "Tasks", icon: ListChecks, hint: "Atomic executable work" },
      { to: "/missions", label: "Missions", icon: Target, hint: "Overarching transformation goal per client" },
      { to: "/journeys", label: "Journeys", icon: Compass, hint: "Capability areas (contain Quests)" },
      { to: "/quests", label: "Quests", icon: Compass, hint: "Group Sparks → advance Components" },
      { to: "/sparks", label: "Sparks", icon: Sparkles, hint: "Atomic interactions (system-generated)" },
    ],
  },
  {
    label: "Library",
    caption: "Definitions · what CAN be done",
    collapsible: true,
    items: [
      { to: "/bizzybots", label: "BizzyBots", icon: Bot, hint: "9 Lens agents — ask any subject" },
      { to: "/workflows", label: "Workflows", icon: Workflow, hint: "Stored, versioned, reusable" },
      { to: "/session-templates", label: "Session Templates", icon: Calendar, hint: "Mirror / Machine / Map / Sync catalog" },
      { to: "/playbooks", label: "Playbooks", icon: LibraryIcon, hint: "How a service runs end-to-end" },
      { to: "/components", label: "Components", icon: Layers, hint: "Reusable building blocks (maturity-tracked)" },
      { to: "/personas", label: "Personas", icon: Users, hint: "Buyer archetypes" },
      { to: "/outcomes", label: "Outcomes", icon: Target, hint: "Six measurable result types" },
      { to: "/library/jtbd", label: "Jobs-to-be-done", icon: TargetIcon, hint: "What customers hire you for" },
      { to: "/library/ktis", label: "KTIs", icon: Radar, hint: "Forward-facing signal trackers" },
      { to: "/documents", label: "Documents", icon: FileText, hint: "Briefs, deliverables, assets" },
      { to: "/domain-assessments", label: "Domain Assessments", icon: Gauge, hint: "Maturity scoring" },
      { to: "/vault", label: "Vault", icon: Vault, hint: "All captured & generated files" },
      { to: "/domains", label: "Domains", icon: Gauge, hint: "22 universal areas of excellence" },
      { to: "/tenets", label: "Tenets", icon: Sparkles, hint: "Industry-specific anchors" },
    ],
  },
  {
    label: "Settings",
    caption: "Rubrics, prompts, team",
    collapsible: true,
    items: [
      { to: "/settings/canon", label: "Entity Canon", icon: Sparkles, hint: "What perfection looks like per entity" },
      { to: "/settings/lens-canon", label: "Lens Canon", icon: BookOpen, hint: "Curated best-practice Lens perspectives" },
      { to: "/settings/prompts", label: "Prompt Console", icon: Wand2, hint: "Every editable AI prompt in one place" },
      { to: "/settings/spark-templates", label: "Spark Library", icon: BookOpen, hint: "Curated, reusable Spark templates" },
      { to: "/settings/excellence", label: "Excellence rubric", icon: Sparkles, hint: "L1→L5 across the 5 Ps" },
      { to: "/settings/lenses", label: "BizzyBot prompts", icon: Bot, hint: "Edit AI instructions per Lens" },
      { to: "/settings/open-decisions", label: "Open decisions", icon: FileText, hint: "Architecture decisions we have not yet settled" },
      { to: "/settings/ux-audit", label: "UX Audit", icon: Sparkles, hint: "Design system audit" },
      { to: "/settings", label: "Team & profile", icon: Settings },
    ],
  },
];

interface SidebarNavProps {
  /** Called when user clicks a link — mobile drawer uses this to close itself. */
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const location = useLocation();

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(to + "/");
  }

  const defaultOpenMap: Record<string, boolean> = {};
  for (const g of SIDEBAR_GROUPS) {
    if (g.collapsible) {
      defaultOpenMap[g.label] = g.items.some((i) => isActive(i.to));
    }
  }
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(defaultOpenMap);

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-iris text-white shadow-[var(--shadow-glow)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">SweetBOS</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Operating System
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SIDEBAR_GROUPS.map((group) => {
          const open = group.collapsible ? (openMap[group.label] ?? false) : true;
          return (
            <div key={group.label} className="mb-4">
              {group.collapsible ? (
                <button
                  type="button"
                  onClick={() => setOpenMap((m) => ({ ...m, [group.label]: !open }))}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                  title={group.caption}
                >
                  <span>{group.label}</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
                </button>
              ) : (
                <div
                  className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  title={group.caption}
                >
                  {group.label}
                </div>
              )}
              {!group.collapsible && (
                <div className="px-3 pb-1.5 text-[10px] text-muted-foreground/70">
                  {group.caption}
                </div>
              )}
              {open && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          title={item.hint}
                          onClick={onNavigate}
                          className={cn(
                            "group relative flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-150",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[var(--shadow-glass)]"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                          )}
                        >
                          {active && (
                            <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-iris" />
                          )}
                          {Icon && (
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                active ? "text-[color:var(--iris-violet)]" : "text-muted-foreground",
                              )}
                            />
                          )}
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Phase 2.10p · Vault + JTBD</span>
          <span className="font-mono text-[10px] opacity-70">v0.2</span>
        </div>
      </div>
    </>
  );
}
