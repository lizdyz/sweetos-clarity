import { useState, type ReactNode } from "react";
import { ObjectCompanion, SweetLensButton } from "@/components/object-companion";
import type { ObjectKind } from "@/lib/lens-types";
import { cn } from "@/lib/utils";

interface Props {
  /** Object kind passed through to <ObjectCompanion>. */
  objectKind: ObjectKind;
  /** Object id passed through to <ObjectCompanion>. */
  objectId: string;
  /** Title shown in the SweetLens panel header. */
  objectTitle: string;
  /** Optional body text for the lens. */
  objectBody?: string | null;
  /** Header chips/buttons rendered to the LEFT of the SweetLens toggle. */
  headerLeft?: ReactNode;
  /** Header chips/buttons rendered to the RIGHT of the SweetLens toggle (e.g. WalkMenu). */
  headerRight?: ReactNode;
  /** Main page content. */
  children: ReactNode;
  /** Extra className applied to the outer grid wrapper. */
  className?: string;
}

/**
 * Standard wrapper for any detail page that exposes the SweetLens companion.
 *
 * Locks in one canonical layout so every route looks identical:
 *   ┌──────────────────────────────────────────┬──────────────┐
 *   │ [headerLeft]  [SweetLens]  [headerRight] │              │
 *   │                                          │              │
 *   │  {children}                              │  Companion   │
 *   │                                          │  (when open) │
 *   └──────────────────────────────────────────┴──────────────┘
 *
 *  - Outer is always a 2-col grid when lens is open, single column otherwise.
 *  - Header bar is always `px-6 pt-4` and right-aligned.
 *  - Companion is always sticky-top in a `pt-4 lg:pr-6` cell.
 */
export function SweetLensLayout({
  objectKind,
  objectId,
  objectTitle,
  objectBody,
  headerLeft,
  headerRight,
  children,
  className,
}: Props) {
  const [lensOpen, setLensOpen] = useState(false);
  return (
    <div
      className={cn(
        "grid gap-4",
        lensOpen && "lg:grid-cols-[minmax(0,1fr)_360px]",
        className,
      )}
    >
      <div className="min-w-0 space-y-5">
        <div className="flex items-center justify-end gap-2 px-6 pt-4">
          {headerLeft}
          <SweetLensButton active={lensOpen} onClick={() => setLensOpen((o) => !o)} />
          {headerRight}
        </div>
        {children}
      </div>
      {lensOpen && (
        <div className="px-6 pt-4 lg:pr-6">
          <ObjectCompanion
            objectKind={objectKind}
            objectId={objectId}
            objectTitle={objectTitle}
            objectBody={objectBody}
            className="self-start lg:sticky lg:top-4"
          />
        </div>
      )}
    </div>
  );
}
