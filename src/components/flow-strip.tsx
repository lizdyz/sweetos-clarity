// Tiny breadcrumb-of-flow strip used to visually link related intake/triage
// surfaces (Capture → Sandbox → Queue → Routed). Removes the "what's the
// difference between these pages?" friction in one glance.

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlowStep {
  to: string;
  label: string;
  caption?: string;
}

interface FlowStripProps {
  steps: FlowStep[];
  /** Index of the step that represents the page the user is currently on. */
  currentIndex: number;
  className?: string;
}

export function FlowStrip({ steps, currentIndex, className }: FlowStripProps) {
  return (
    <nav
      aria-label="Pipeline flow"
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-full border bg-surface/50 px-2 py-1 text-[11px]",
        className,
      )}
    >
      {steps.map((s, i) => {
        const isCurrent = i === currentIndex;
        return (
          <span key={s.to} className="inline-flex items-center gap-1">
            <Link
              to={s.to}
              title={s.caption}
              className={cn(
                "rounded-full px-2 py-0.5 font-medium transition",
                isCurrent
                  ? "bg-iris text-white shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {s.label}
            </Link>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
            )}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Canonical intake/triage flow used across Capture, Sandbox, Queue.
 * Pass the right `currentIndex` from each route.
 */
export const INTAKE_FLOW: FlowStep[] = [
  { to: "/capture", label: "Capture", caption: "Drop raw thoughts" },
  { to: "/sandbox", label: "Sandbox", caption: "Frame & route" },
  { to: "/queue", label: "Queue", caption: "Review proposals" },
  { to: "/today", label: "Routed", caption: "On the working surface" },
];
