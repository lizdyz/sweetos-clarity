import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageCaptureButton } from "@/components/page-capture-button";

interface PageHeaderProps {
  title: string;
  purpose: string;
  whatYouCanDo?: string[];
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /**
   * Entity canon kind for this page (e.g. "relationship", "project", "persona").
   * When provided, mounts the per-page Capture button next to the actions.
   */
  subjectKind?: string;
  /** Specific subject id — when set, pollination scopes to it. */
  subjectId?: string | null;
  /** Friendly label, e.g. the entity's name. */
  subjectLabel?: string | null;
}

/**
 * Compact "why this page exists" banner.
 * One sentence describing the page's purpose, plus optional 3-bullet "what you can do here".
 * When `subjectKind` is provided, also renders the canon-driven Capture popover.
 */
export function PageHeader({
  title,
  purpose,
  whatYouCanDo,
  icon,
  actions,
  className,
  subjectKind,
  subjectId,
  subjectLabel,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-5 flex items-start gap-3", className)}>
      {icon && (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-iris-soft/60 to-iris/30 text-foreground shadow-[var(--shadow-glass)]">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{purpose}</p>
        {whatYouCanDo && whatYouCanDo.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {whatYouCanDo.map((b, i) => (
              <li key={i} className="inline-flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-iris/70" />
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
      {(actions || subjectKind) && (
        <div className="shrink-0 flex items-center gap-2">
          {subjectKind && (
            <PageCaptureButton
              subjectKind={subjectKind}
              subjectId={subjectId ?? null}
              subjectLabel={subjectLabel ?? null}
            />
          )}
          {actions}
        </div>
      )}
    </header>
  );
}
