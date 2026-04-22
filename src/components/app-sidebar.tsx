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
  Library,
  Gauge,
  Map,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon?: LucideIcon;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const PRIMARY: NavGroup[] = [
  {
    items: [
      { to: "/today", label: "Today", icon: LayoutDashboard },
      { to: "/capture", label: "Capture", icon: Sparkles },
      { to: "/queue", label: "Proposals Queue", icon: Inbox },
      { to: "/pipeline", label: "Pipeline", icon: Compass },
    ],
  },
  {
    label: "Work",
    items: [
      { to: "/my-tasks", label: "My tasks", icon: Inbox },
      { to: "/people", label: "People", icon: Users },
      { to: "/operators", label: "Operators", icon: Bot },
      { to: "/projects", label: "Projects", icon: Workflow },
      { to: "/tasks", label: "Tasks", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operate",
    items: [
      { to: "/flightdeck", label: "Flightdeck", icon: Map },
      { to: "/relationships", label: "Relationships", icon: Users },
      { to: "/engagement-plans", label: "Engagement Plans", icon: Compass },
      { to: "/domains", label: "Domains", icon: Gauge },
      { to: "/workflows", label: "Workflows", icon: Workflow },
      { to: "/settings/excellence", label: "Excellence", icon: Sparkles },
    ],
  },
];

const LIBRARY: NavItem[] = [
  { to: "/personas", label: "Personas" },
  { to: "/components", label: "Components" },
  { to: "/playbooks", label: "Playbooks" },
  { to: "/documents", label: "Documents" },
  { to: "/decisions", label: "Decisions" },
  { to: "/delegation", label: "Delegation" },
  { to: "/sparks", label: "Sparks" },
  { to: "/quests", label: "Quests" },
  { to: "/journeys", label: "Journeys" },
  { to: "/missions", label: "Missions" },
  { to: "/outcomes", label: "Outcomes" },
  { to: "/domain-assessments", label: "Domain Assessments" },
  { to: "/sessions", label: "Sessions" },
  { to: "/campaigns", label: "Campaigns" },
];

export function AppSidebar() {
  const location = useLocation();
  const libraryActive = LIBRARY.some(
    (i) => location.pathname === i.to || location.pathname.startsWith(i.to + "/"),
  );
  const [libOpen, setLibOpen] = useState<boolean>(libraryActive);

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(to + "/");
  }

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
        {PRIMARY.map((group, gi) => (
          <div key={gi} className="mb-5">
            {group.label && (
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
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
          </div>
        ))}

        {/* Library — collapsible */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setLibOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <Library className="h-3 w-3" />
              Library
            </span>
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", libOpen && "rotate-180")}
            />
          </button>
          {libOpen && (
            <ul className="mt-1 space-y-0.5">
              {LIBRARY.map((item) => {
                const active = isActive(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl px-3 py-1.5 pl-7 text-sm transition-all duration-150",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[var(--shadow-glass)]"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-iris" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <ul className="space-y-0.5">
            <li>
              <Link
                to="/settings"
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  isActive("/settings")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[var(--shadow-glass)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Settings & Team</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Phase 2.6 · Intelligence</span>
          <span className="font-mono text-[10px] opacity-70">v0.2</span>
        </div>
      </div>
    </aside>
  );
}
