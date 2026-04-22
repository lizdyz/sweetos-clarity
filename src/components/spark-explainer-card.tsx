import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapsible "What is a Spark?" explainer card shown at the top of /sparks.
 * Closes the conceptual loop: Spark → Quest → Component.
 */
export function SparkExplainerCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-iris-soft text-[color:var(--iris-violet)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">What is a Spark?</div>
            <div className="text-[11px] text-muted-foreground">
              The atomic unit of advancement — between sessions
            </div>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Sparks</span> are tiny, self-paced
            interactions a person completes between sessions. Each Spark is system-generated —
            never created by hand — and rolls up into a parent <span className="font-medium text-foreground">Quest</span>.
          </p>
          <p>
            Every Spark advances one or more <span className="font-medium text-foreground">Components</span>{" "}
            (look for the chip in each row). Confirming a Spark increases that Component's maturity.
          </p>
          <ul className="ml-4 list-disc space-y-1 text-[13px]">
            <li><span className="font-medium text-foreground">Internal</span> — your own SweetBOS work.</li>
            <li><span className="font-medium text-foreground">Client SweetSync</span> — work anchored to a client relationship.</li>
          </ul>
        </div>
      )}
    </section>
  );
}
