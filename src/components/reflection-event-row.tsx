import { Link } from "@tanstack/react-router";
import { Sparkles, ClipboardList, Map, Target, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReflectionEvent {
  id: string;
  kind: "quest_completion" | "component_levelup" | "journey_milestone" | "mission_milestone" | "periodic" | "custom";
  source_kind: string | null;
  source_id: string | null;
  relationship_id: string | null;
  title: string;
  prompt: string | null;
  responded_at: string | null;
  created_at: string;
}

const KIND_CFG: Record<ReflectionEvent["kind"], { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  quest_completion: { label: "Quest", icon: ClipboardList, tone: "text-[color:var(--iris-violet)]" },
  component_levelup: { label: "Level-up", icon: Sparkles, tone: "text-amber-600" },
  journey_milestone: { label: "Journey", icon: Map, tone: "text-sky-600" },
  mission_milestone: { label: "Mission", icon: Target, tone: "text-emerald-600" },
  periodic: { label: "Periodic", icon: Clock, tone: "text-muted-foreground" },
  custom: { label: "Custom", icon: Star, tone: "text-muted-foreground" },
};

interface Props {
  event: ReflectionEvent;
  className?: string;
}

export function ReflectionEventRow({ event, className }: Props) {
  const cfg = KIND_CFG[event.kind];
  const Icon = cfg.icon;
  const open = !event.responded_at;
  const sourceLink = sourceLinkFor(event);
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-background p-3",
        open && "ring-1 ring-amber-500/30",
        className,
      )}
    >
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted", cfg.tone)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium">{event.title}</p>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {cfg.label}
          </span>
        </div>
        {event.prompt && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{event.prompt}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          {open ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-400">
              Awaiting reflection
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
              Reflected
            </span>
          )}
          {sourceLink}
        </div>
      </div>
    </div>
  );
}

function sourceLinkFor(event: ReflectionEvent): React.ReactNode {
  if (!event.source_id || !event.source_kind) return null;
  const map: Record<string, "/quests/$id" | "/journeys/$id" | "/missions/$id" | "/components/$id"> = {
    quest: "/quests/$id",
    journey: "/journeys/$id",
    mission: "/missions/$id",
    component: "/components/$id",
  };
  const path = map[event.source_kind];
  if (!path) return null;
  return (
    <Link
      to={path}
      params={{ id: event.source_id }}
      className="hover:underline"
    >
      Open {event.source_kind}
    </Link>
  );
}
