import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  FolderKanban,
  CheckSquare,
  CalendarClock,
  Workflow,
  Component,
  BookOpen,
  Gauge,
  HandshakeIcon,
  GitBranch,
  FileText,
  Megaphone,
  Inbox,
  Search,
  Compass,
  Settings,
  UserCircle2,
  Target,
  Map,
  Flag,
  Flame,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group?: string;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { to: "/today", label: "Today", icon: LayoutDashboard, group: "Overview" },
  { to: "/pipeline", label: "Pipeline", icon: Compass, group: "Overview" },
  { to: "/capture", label: "Capture", icon: Sparkles, group: "Overview", soon: true },

  { to: "/relationships", label: "Relationships", icon: Users, group: "Operate" },
  { to: "/projects", label: "Projects", icon: FolderKanban, group: "Operate" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, group: "Operate" },
  { to: "/sessions", label: "Sessions", icon: CalendarClock, group: "Operate" },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone, group: "Operate" },

  { to: "/workflows", label: "Workflows", icon: Workflow, group: "Build" },
  { to: "/components", label: "Components", icon: Component, group: "Build" },
  { to: "/playbooks", label: "Playbooks", icon: BookOpen, group: "Build" },
  { to: "/domain-assessments", label: "Domain Assessments", icon: Gauge, group: "Build" },

  { to: "/personas", label: "Personas", icon: UserCircle2, group: "Transformation" },
  { to: "/missions", label: "Missions", icon: Target, group: "Transformation" },
  { to: "/journeys", label: "Journeys", icon: Map, group: "Transformation" },
  { to: "/quests", label: "Quests", icon: Flag, group: "Transformation" },
  { to: "/sparks", label: "Sparks", icon: Flame, group: "Transformation" },
  { to: "/outcomes", label: "Outcomes", icon: Trophy, group: "Transformation" },

  { to: "/delegation", label: "Delegation", icon: HandshakeIcon, group: "Knowledge" },
  { to: "/decisions", label: "Decisions", icon: GitBranch, group: "Knowledge" },
  { to: "/documents", label: "Documents", icon: FileText, group: "Knowledge" },

  { to: "/review", label: "Review Queue", icon: Inbox, group: "Intelligence", soon: true },
  { to: "/search", label: "Search", icon: Search, group: "Intelligence", soon: true },

  { to: "/settings", label: "Settings & Team", icon: Settings, group: "System" },
];

export function AppSidebar() {
  const location = useLocation();
  const groups = Array.from(new Set(NAV.map((n) => n.group).filter(Boolean))) as string[];

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
        {groups.map((group) => (
          <div key={group} className="mb-5">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group}
            </div>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
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
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-[color:var(--iris-violet)]" : "text-muted-foreground",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.soon && (
                        <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          soon
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Phase 1 · Foundation</span>
          <span className="font-mono text-[10px] opacity-70">v0.1</span>
        </div>
      </div>
    </aside>
  );
}
