import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderConnection {
  /** Route path. Optional — if omitted, renders as plain text. */
  to?: string;
  label: string;
}

interface PageHeaderProps {
  title: string;
  purpose: string;
  whatYouCanDo?: string[];
  /**
   * Wave 20 contract: chips linking to upstream/downstream surfaces.
   * Forces every page to declare its place in the system graph.
   */
  connectsTo?: PageHeaderConnection[];
  /**
   * Wave 20 contract: verb-led counts/actions for the user's next move
   * ("Triage 3", "Promote 2", "Archive 1"). Pure strings — render as a row of
   * pills under the bullets. Pages without this end up visibly incomplete,
   * which is the signal to fix them.
   */
  nextSteps?: string[];
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** @deprecated — Capture now lives in the topbar and auto-detects context. */
  subjectKind?: string;
  /** @deprecated */
  subjectId?: string | null;
  /** @deprecated */
  subjectLabel?: string | null;
}

/**
 * Page contract banner. Declares: what · why · do · connects to · next.
 * See `mem://design/page-contract.md`.
 *
 * NOTE: The page-level Capture button has been moved to the topbar.
 */
export function PageHeader({
  title,
  purpose,
  whatYouCanDo,
  connectsTo,
  nextSteps,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-5 flex items-start gap-3", className)}>
      {icon && (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-iris-soft/60 to-iris/30 text-foreground shadow-[var(--shadow-glass)]">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{purpose}</p>
        {whatYouCanDo && whatYouCanDo.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {whatYouCanDo.map((b, i) => (
              <li key={i} className="inline-flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-iris/70" />
                {b}
              </li>
            ))}
          </ul>
        )}
        {connectsTo && connectsTo.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
            <span className="inline-flex items-center gap-1 text-muted-foreground/80">
              <Link2 className="h-3 w-3" /> Connects to:
            </span>
            {connectsTo.map((c, i) =>
              c.to ? (
                <Link
                  key={i}
                  to={c.to}
                  className="rounded-full border bg-surface/50 px-2 py-0.5 font-medium text-foreground/80 transition hover:border-iris/40 hover:text-iris"
                >
                  {c.label}
                </Link>
              ) : (
                <span key={i} className="rounded-full border bg-surface/50 px-2 py-0.5 font-medium text-foreground/80">
                  {c.label}
                </span>
              ),
            )}
          </div>
        )}
        {nextSteps && nextSteps.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 text-muted-foreground/80">
              <ArrowRight className="h-3 w-3" /> Next:
            </span>
            {nextSteps.map((s, i) => (
              <span
                key={i}
                className="rounded-full bg-iris-soft/70 px-2 py-0.5 font-medium text-iris"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </header>
  );
}
