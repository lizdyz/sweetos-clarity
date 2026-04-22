import { SidebarNav } from "@/components/sidebar-nav";

/**
 * Desktop sidebar wrapper. Hidden below md (768px); the topbar hamburger opens
 * the same nav inside a `<Sheet>` drawer on narrow viewports.
 */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl md:flex md:flex-col">
      <SidebarNav />
    </aside>
  );
}
