// Universal Entity Shell — the canonical Zone 1-5 layout for every detail page
// in the app. Composes existing pieces:
//   Z1  CanonGuardrail header chip
//   Z2  WorkContextStrip (relationship › plan › service › session breadcrumbs)
//   Z3  ConnectionRail (Walk the graph: up/down/produces/consumes/advances/tagged)
//   Z4  Tabs slot (entity-specific) + always-on "Canon" tab
//   Z5  EvidenceFooter (audit log, generation metadata)
//
// Detail pages keep their existing content and just pass it as `children` /
// `tabs`. Nothing is rewritten — this is composition.

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanonGuardrail } from "@/components/canon-guardrail";
import { WorkContextStrip } from "@/components/work-context-strip";
import { ConnectionRail } from "@/components/connection-rail";
import { EntityCanonTab } from "@/components/entity-canon-tab";
import { EvidenceFooter } from "@/components/evidence-footer";
import { WalkMenu } from "@/components/walk-menu";
import { type WalkKind } from "@/lib/walk-menu-resolvers";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Entity kinds used by EntityShell. Wider than WalkKind so we can mount the
 * shell on entities that don't yet have a graph resolver — those entities just
 * skip the ConnectionRail.
 */
export type EntityShellKind =
  | WalkKind
  | "spark"
  | "decision"
  | "component"
  | "relationship"
  | "mission"
  | "journey"
  | "quest"
  | "playbook"
  | "document"
  | "persona"
  | "outcome";

const WALK_KINDS = new Set<EntityShellKind>(["task", "project", "workflow_run", "session"]);

export interface EntityShellTab {
  key: string;
  label: string;
  icon?: ReactNode;
  body: ReactNode;
}

interface Props {
  kind: WalkKind;
  id: string;
  /** Optional header content (title, status pills, etc.) shown in Zone 1. */
  header?: ReactNode;
  /** Entity-specific tabs. The "Canon" tab is auto-appended. */
  tabs?: EntityShellTab[];
  /** Default tab key. Falls back to first tab. */
  defaultTabKey?: string;
  /** Generation metadata for the evidence footer. */
  generationMetadata?: {
    model?: string | null;
    promptKey?: string | null;
    generatedAt?: string | null;
  } | null;
  /** Hide the WorkContextStrip (some entities don't have a parent project). */
  hideWorkContext?: boolean;
  className?: string;
}

/**
 * Map our generic walk kind to the entity_canon row's entity_kind.
 * They're already aligned for most kinds.
 */
function canonKindFor(kind: WalkKind): string {
  return kind;
}

export function EntityShell({
  kind,
  id,
  header,
  tabs = [],
  defaultTabKey,
  generationMetadata,
  hideWorkContext,
  className,
}: Props) {
  const allTabs: EntityShellTab[] = [
    ...tabs,
    {
      key: "canon",
      label: "Canon",
      icon: <BookOpen className="h-3 w-3" />,
      body: <EntityCanonTab entityKind={canonKindFor(kind)} />,
    },
  ];

  const initial = defaultTabKey ?? allTabs[0]?.key ?? "canon";
  const [tab, setTab] = useState(initial);

  const isWorkContextEntity = kind === "task" || kind === "project";

  return (
    <div className={cn("space-y-4 px-6 pt-5 pb-8", className)}>
      {/* Z1 — Canonical header (CanonGuardrail + walk menu pinned right) */}
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          {header}
          <CanonGuardrail entityKind={canonKindFor(kind)} />
        </div>
        <div className="shrink-0">
          <WalkMenu kind={kind} id={id} />
        </div>
      </header>

      {/* Z2 — Work context strip (only for task/project right now) */}
      {!hideWorkContext && isWorkContextEntity && (
        <WorkContextStrip entityType={kind as "task" | "project"} entityId={id} />
      )}

      {/* Z3 + Z4 — Side-by-side connection rail + tabs */}
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ConnectionRail kind={kind} id={id} className="self-start" />

        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex w-full justify-start gap-1 overflow-x-auto rounded-xl bg-surface p-1">
              {allTabs.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="gap-1.5 text-xs data-[state=active]:bg-background"
                >
                  {t.icon}
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {allTabs.map((t) => (
              <TabsContent key={t.key} value={t.key} className="mt-3">
                <div className="rounded-2xl border border-border bg-card">
                  {t.body}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Z5 — Evidence footer */}
      <EvidenceFooter
        subjectKind={kind}
        subjectId={id}
        generationMetadata={generationMetadata}
      />
    </div>
  );
}
