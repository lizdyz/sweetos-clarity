import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Moon, Search, Sun, Sparkles, LogOut, Menu } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { BotAlertsBell } from "@/components/bot-alerts-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppTopBar() {
  const { theme, toggle } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Auto-close mobile drawer on route change.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-5 backdrop-blur-xl">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 border-sidebar-border bg-sidebar/95 p-0 backdrop-blur-xl"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="relative flex max-w-md flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          readOnly
          onClick={(e) => e.preventDefault()}
          placeholder="Search anything…   ⌘K"
          className="h-9 cursor-pointer rounded-xl border-border bg-surface pl-9 pr-3 text-sm shadow-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="hidden rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
          Quick capture
          <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            soon
          </span>
        </Button>

        <BotAlertsBell />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-9 w-9 rounded-xl"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-2 rounded-xl pl-1.5 pr-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-iris text-xs font-bold text-white">
                {(user?.email?.[0] ?? "?").toUpperCase()}
              </span>
              <span className="hidden text-sm font-medium md:inline">
                {user?.email?.split("@")[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-sm font-medium">{user?.email}</span>
              <span className="text-[11px] text-muted-foreground">
                {isAdmin ? "Admin" : "Member"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
