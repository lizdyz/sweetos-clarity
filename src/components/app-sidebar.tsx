import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Workflow,
  Inbox,
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
  /** When true the group renders collapsed by default and can toggle. */
  collapsible?: boolean;
}

/**
 * Canonical IA — mirrors the four layers in the SweetBOS canon docs:
 *   Today (write surface) · Operate (operator side) · Library (definitions)
 *   · SweetSync (client side, system-generated) · People · Taxonomies · Settings.
 *
 * See `mem://design/sidebar-ia.md` and `mem://design/canon-sparks-vs-tasks.md`.
 */
const GROUPS: NavGroup[] = [
  {
    label: "Today",
    caption: "Live working surface",
    items: [
      { to: "/today", label: "Today", icon: LayoutDashboard, hint: "Live working surface" },
      { to: "/planner", label: "Planner", icon: Layers, hint: "Plan this week / next / backlog" },
      { to: "/calendar", label: "Calendar", icon: Calendar, hint: "Visual time view" },
      { to: "/capture", label: "Capture", icon: Sparkles, hint: "Get raw input in fast" },
      { to: "/queue", label: "Proposals Queue", icon: Inbox, hint: "Review system proposals" },
      { to: "/my-tasks", label: "My tasks", icon: ListChecks, hint: "Work assigned to you" },
    ],
  },
  {
    label: "Operate",
    caption: "Operator side · SweetCycle delivery",
    items: [
      { to: "/pipeline", label: "Pipeline", icon: Compass, hint: "Sales & engagement pipeline" },
      { to: "/flightdeck", label: "Flightdeck", icon: Map, hint: "Cross-relationship cockpit" },
      { to: "/sweetcycle", label: "SweetCycle", icon: Compass, hint: "Active client journey" },
      { to: "/sessions", label: "Sessions", icon: Calendar, hint: "Mirror / Machine / Map / Sync" },
      { to: "/measures", label: "Measures", icon: Gauge, hint: "Objectives, KRs, KPIs, CSFs" },
      { to: "/engagement-plans", label: "Engagement Plans", icon: Send, hint: "Contract shape per relationship" },
      { to: "/campaigns", label: "Campaigns", icon: Megaphone },
      { to: "/delegation", label: "Delegation", icon: GitBranch, hint: "What only Liz can do" },
      { to: "/decisions", label: "Decisions", icon: FileText, hint: "Logged choices & rationale" },
      { to: "/documents", label: "Documents", icon: FileText, hint: "Briefs, deliverables, assets" },
    ],
  },
  {
    label: "Library",
    caption: "Definitions · what CAN be done",
    collapsible: true,
    items: [
      { to: "/workflows", label: "Workflows", icon: Workflow, hint: "Stored, versioned, reusable" },
      { to: "/session-templates", label: "Session Templates", icon: Calendar, hint: "Mirror / Machine / Map / Sync catalog" },
      { to: "/playbooks", label: "Playbooks", icon: LibraryIcon, hint: "How a service runs end-to-end" },
      { to: "/personas", label: "Personas", icon: Users, hint: "Buyer archetypes" },
      { to: "/components", label: "Components", icon: Layers, hint: "Reusable building blocks (maturity-tracked)" },
      { to: "/outcomes", label: "Outcomes", icon: Target, hint: "Six measurable result types" },
    ],
  },
  {
    label: "SweetSync",
    caption: "Client side · system-generated",
    collapsible: true,
    items: [
      { to: "/missions", label: "Missions", icon: Target, hint: "Overarching transformation goal" },
      { to: "/journeys", label: "Journeys", icon: Compass, hint: "Capability areas (contain Quests)" },
      { to: "/quests", label: "Quests", icon: Compass, hint: "Group Sparks → advance Components" },
      { to: "/sparks", label: "Sparks", icon: Sparkles, hint: "System-generated atomic interactions" },
      { to: "/domain-assessments", label: "Domain Assessments", icon: Gauge, hint: "Maturity scoring" },
    ],
  },
  {
    label: "People",
    caption: "Relationships, contacts, operators",
    collapsible: true,
    items: [
      { to: "/relationships", label: "Relationships", icon: Users },
      { to: "/people", label: "People", icon: Users },
      { to: "/operators", label: "Operators", icon: Bot, hint: "Humans, workflows & AI agents" },
      { to: "/projects", label: "Projects", icon: Workflow },
      { to: "/tasks", label: "Tasks", icon: ListChecks, hint: "Atomic executable work" },
    ],
  },
  {
    label: "Taxonomies",
    caption: "Universal vs industry",
    collapsible: true,
    items: [
      { to: "/domains", label: "Domains", icon: Gauge, hint: "22 universal areas of excellence" },
      { to: "/tenets", label: "Tenets", icon: Sparkles, hint: "Industry-specific anchors" },
    ],
  },
  {
    label: "Settings",
    caption: "Rubrics, prompts, team",
    collapsible: true,
    items: [
      { to: "/settings/excellence", label: "Excellence rubric", icon: Sparkles, hint: "L1→L5 across the 5 Ps" },
      { to: "/settings/lenses", label: "BizzyBot prompts", icon: Bot, hint: "Edit AI instructions per Lens" },
      { to: "/settings", label: "Team & profile", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(to + "/");
  }

  // For collapsible groups, default open if any child is currently active.
  const defaultOpenMap: Record<string, boolean> = {};
  for (const g of GROUPS) {
    if (g.collapsible) {
      defaultOpenMap[g.label] = g.items.some((i) => isActive(i.to));
    }
  }
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(defaultOpenMap);

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl md:flex md:flex-col">
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
        {GROUPS.map((group) => {
          const open = group.collapsible ? (openMap[group.label] ?? false) : true;
          return (
            <div key={group.label} className="mb-4">
              {group.collapsible ? (
                <button
                  type="button"
                  onClick={() =>
                    setOpenMap((m) => ({ ...m, [group.label]: !open }))
                  }
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                  title={group.caption}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
                  />
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
                                active
                                  ? "text-[color:var(--iris-violet)]"
                                  : "text-muted-foreground",
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
          <span>Phase 2.10n · Canon</span>
          <span className="font-mono text-[10px] opacity-70">v0.2</span>
        </div>
      </div>
    </aside>
  );
}
