// In-dialog explainer chip — keeps the canon hierarchy crisp at create time.
// Mount this near the title of any Mission/Journey/Quest/Project/Task create flow.
// See mem://design/planning-hierarchy.md for the canonical 6-level rule.
import { Info } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

export type EntityKind =
  | "mission"
  | "journey"
  | "quest"
  | "project"
  | "task"
  | "jtbd"
  | "component"
  | "decision";

interface CanonEntry {
  label: string;
  oneLiner: string;
  goodExamples: string[];
  antiExample: string;
  parent?: EntityKind;
}

export const ENTITY_CANON: Record<EntityKind, CanonEntry> = {
  mission: {
    label: "Mission",
    oneLiner:
      "The long-term WHY. One per org. Rarely changes. Spans years, not quarters.",
    goodExamples: [
      "SweetOS Clarity is the OS for service businesses",
      "Acme becomes the trusted CFO partner for SaaS founders",
    ],
    antiExample: "Ship the lens system in Q3 (that's a Journey).",
  },
  journey: {
    label: "Journey",
    oneLiner:
      "A multi-quarter capability arc. 2–4 active per Mission. Each Journey contains Quests.",
    parent: "mission",
    goodExamples: [
      "Ship v1 of Clarity to first 10 paying users",
      "Build the Operator Cockpit to L4 maturity",
    ],
    antiExample: "Mount SweetLens on the quests page (that's a Task).",
  },
  quest: {
    label: "Quest",
    oneLiner:
      "A themed body of work that advances Components. Holds Sparks, JTBDs, Projects, Decisions. Lives for weeks–months.",
    parent: "journey",
    goodExamples: [
      "Lens System",
      "Capture → Routed pipeline",
      "Decision Factory cockpit",
    ],
    antiExample: "Wave 21 — final wiring (that's a Project under a Quest).",
  },
  project: {
    label: "Project",
    oneLiner:
      "A time-boxed effort that produces deliverables for a Quest. Days–weeks. Holds Tasks.",
    parent: "quest",
    goodExamples: [
      "Wave 21 — SweetLens final wiring",
      "Onboarding revamp (Q1 sprint)",
    ],
    antiExample:
      "Build the operator dashboard forever (that's a Quest, not a Project).",
  },
  task: {
    label: "Task",
    oneLiner:
      "The atomic unit of work. Assigned to one Operator. Hours–days. Should fit on a sticky note.",
    parent: "project",
    goodExamples: [
      "Mount <SweetLensButton> on /quests/$id",
      "Migrate audit allow-list to include lens_outputs",
    ],
    antiExample:
      "Redesign the whole capture surface (that's a Project or a Quest).",
  },
  jtbd: {
    label: "JTBD",
    oneLiner:
      "What a user is hiring this for. Stated as: When [context], I want to [motivation], so I can [outcome].",
    goodExamples: [
      "When I open a Decision, I want the right lens auto-suggested so I can settle it faster",
    ],
    antiExample:
      "Build the lens picker (that's a Component or a Task, not a JTBD).",
  },
  component: {
    label: "Component",
    oneLiner:
      "A reusable piece of product. Maturity-tracked L1→L5. Owned by one operator.",
    goodExamples: ["SweetLens panel", "Lens Studio", "Capture queue"],
    antiExample:
      "The thing we ship next Tuesday (that's a Project's deliverable).",
  },
  decision: {
    label: "Decision",
    oneLiner:
      "An open architectural question or a logged choice + rationale. Blocks Quests when open.",
    goodExamples: [
      "Should F12 Op-alpha auto-run on Sandbox items?",
      "We will store roles in user_roles, never on profiles",
    ],
    antiExample:
      "Pick a font (that's a Task, unless it's load-bearing across the system).",
  },
};

interface Props {
  kind: EntityKind;
  className?: string;
  /** Render the helper inline (chip + popover) or as a full-width banner. */
  variant?: "chip" | "banner";
}

export function EntityKindHelper({ kind, className, variant = "chip" }: Props) {
  const entry = ENTITY_CANON[kind];
  if (!entry) return null;

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/70 bg-iris-soft/40 px-3 py-2 text-[11px] leading-relaxed",
          className,
        )}
      >
        <div className="mb-1 flex items-center gap-1.5">
          <Info className="h-3 w-3 text-[color:var(--iris-violet)]" />
          <span className="font-semibold uppercase tracking-[0.12em] text-[color:var(--iris-violet)]">
            {entry.label}
          </span>
          {entry.parent && (
            <span className="text-muted-foreground">
              · lives under a {ENTITY_CANON[entry.parent].label}
            </span>
          )}
        </div>
        <p className="text-foreground/85">{entry.oneLiner}</p>
        <div className="mt-1.5 grid gap-0.5 text-muted-foreground">
          <span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              ✓
            </span>{" "}
            {entry.goodExamples[0]}
          </span>
          <span>
            <span className="font-medium text-rose-700 dark:text-rose-400">
              ✗
            </span>{" "}
            {entry.antiExample}
          </span>
        </div>
      </div>
    );
  }

  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-iris-soft/60 hover:text-foreground",
            className,
          )}
        >
          <Info className="h-3 w-3" />
          What's a {entry.label}?
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="bottom" align="start">
        <div className="space-y-2 text-xs">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{entry.label}</span>
            {entry.parent && (
              <span className="text-[10px] text-muted-foreground">
                under {ENTITY_CANON[entry.parent].label}
              </span>
            )}
          </div>
          <p className="leading-relaxed text-foreground/85">{entry.oneLiner}</p>
          <div className="space-y-1 border-t border-border/60 pt-2 text-[11px]">
            {entry.goodExamples.map((ex) => (
              <div key={ex} className="flex gap-1.5">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  ✓
                </span>
                <span className="text-muted-foreground">{ex}</span>
              </div>
            ))}
            <div className="flex gap-1.5">
              <span className="font-medium text-rose-700 dark:text-rose-400">
                ✗
              </span>
              <span className="text-muted-foreground">{entry.antiExample}</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
