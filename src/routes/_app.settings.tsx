import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Settings as SettingsIcon, Wand2, BookOpen, Sparkles, Bot, FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsLayout,
});

const NAV: Array<{ to: string; label: string; icon: React.ComponentType<{ className?: string }>; hint?: string; exact?: boolean }> = [
  { to: "/settings", label: "Team & profile", icon: SettingsIcon, exact: true, hint: "Profile · Team · Cadence" },
  { to: "/settings/canon", label: "Entity Canon", icon: ShieldCheck, hint: "What perfection looks like per entity" },
  { to: "/settings/lens-canon", label: "Lens Canon", icon: BookOpen, hint: "Curated Lens perspectives — canon-first" },
  { to: "/settings/prompts", label: "Prompt Console", icon: Wand2 },
  { to: "/settings/spark-templates", label: "Spark Library", icon: BookOpen },
  { to: "/settings/excellence", label: "Excellence rubric", icon: Sparkles },
  { to: "/settings/lenses", label: "BizzyBot prompts", icon: Bot },
  { to: "/settings/open-decisions", label: "Open decisions", icon: FileText },
];

function SettingsLayout() {
  const location = useLocation();
  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface/40 px-3 py-5 md:block">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Settings
        </div>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.hint}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[var(--shadow-glass)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-iris" />}
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[color:var(--iris-violet)]" : "text-muted-foreground")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
