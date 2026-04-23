import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LensSuggester } from "./lens-suggester";
import { LensRunner } from "./lens-runner";
import { LensOutputsList } from "./lens-outputs-list";
import type { Lens, ObjectKind } from "@/lib/lens-types";

interface Props {
  objectKind: ObjectKind;
  objectId: string;
  objectTitle: string;
  objectBody?: string | null;
  /** Optional className for layout positioning. */
  className?: string;
}

/**
 * The runtime sidebar attached to any object. Suggests the right lenses for
 * the object kind, lets the user run an interrogation, and shows structured
 * outputs that can be routed to Tasks / Decisions / etc.
 *
 * Triggered by the SweetLens button in the parent layout.
 */
export function ObjectCompanion({
  objectKind,
  objectId,
  objectTitle,
  objectBody,
  className,
}: Props) {
  const [activeLens, setActiveLens] = useState<Lens | null>(null);
  const [tab, setTab] = useState<"lenses" | "outputs">("lenses");

  return (
    <aside
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm",
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-iris" />
          <h3 className="text-sm font-semibold">SweetLens</h3>
        </div>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          {objectKind}
        </span>
      </header>

      <p className="-mt-2 text-[11px] leading-tight text-muted-foreground">
        Pick a lens to interrogate this {objectKind.replace("_", " ")} — outputs route to Tasks &
        Decisions.
      </p>

      {!activeLens && (
        <>
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setTab("lenses")}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                tab === "lenses"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Lenses
            </button>
            <button
              type="button"
              onClick={() => setTab("outputs")}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                tab === "outputs"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Outputs
            </button>
          </div>

          {tab === "lenses" ? (
            <LensSuggester objectKind={objectKind} onPick={setActiveLens} />
          ) : (
            <LensOutputsList sourceKind={objectKind} sourceId={objectId} />
          )}
        </>
      )}

      {activeLens && (
        <LensRunner
          lens={activeLens}
          sourceKind={objectKind}
          sourceId={objectId}
          sourceTitle={objectTitle}
          sourceBody={objectBody}
          onBack={() => setActiveLens(null)}
        />
      )}
    </aside>
  );
}

/** A toggle button that opens the SweetLens sidebar — for use in topbars / detail-page headers. */
export function SweetLensButton({
  active,
  onClick,
  count,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="gap-1.5"
      title="Open SweetLens — contextual interrogation panel"
    >
      {active ? <X className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      SweetLens
      {!active && count !== undefined && count > 0 && (
        <span className="ml-0.5 rounded-full bg-iris/20 px-1.5 py-0 text-[9px] font-semibold text-iris">
          {count}
        </span>
      )}
    </Button>
  );
}
