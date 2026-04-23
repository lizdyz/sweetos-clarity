import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailShellProps {
  backTo?: string;
  backLabel?: string;
  header: ReactNode;
  workContext?: ReactNode;
  tabs?: ReactNode;
  rail?: ReactNode;
  children: ReactNode;
  evidence?: ReactNode;
  maxWidth?: string;
}

/**
 * Universal detail-page shell: back link → header → work-context strip →
 * tabs/content (or rail+content) → evidence footer.
 * Used by /operators/$id (Wave 2) and adopted incrementally on other detail pages.
 */
export function DetailShell({
  backTo,
  backLabel = "Back",
  header,
  workContext,
  tabs,
  rail,
  children,
  evidence,
  maxWidth = "max-w-[1200px]",
}: DetailShellProps) {
  return (
    <div className={cn("mx-auto space-y-5 p-6", maxWidth)}>
      {backTo && (
        <Link
          to={backTo as never}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> {backLabel}
        </Link>
      )}
      <header>{header}</header>
      {workContext && <div>{workContext}</div>}
      {tabs && <div>{tabs}</div>}
      {rail ? (
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <aside className="space-y-2">{rail}</aside>
          <main className="space-y-5">{children}</main>
        </div>
      ) : (
        !tabs && <div className="space-y-5">{children}</div>
      )}
      {tabs && <div className="space-y-5">{children}</div>}
      {evidence && <div className="border-t border-border/40 pt-5">{evidence}</div>}
    </div>
  );
}
