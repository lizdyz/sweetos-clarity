import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, User, Users as UsersIcon } from "lucide-react";

export const PHASES = ["Seed", "Synthesize", "Session", "Sync", "Ship"] as const;
export type SweetPhase = (typeof PHASES)[number];

export interface SweetSession {
  id: string;
  name: string;
  sweetcycle_phase: SweetPhase | null;
  phase_owner: "client" | "us" | "both" | null;
  phase_due_date: string | null;
  phase_blocker: string | null;
  session_date: string | null;
}

const PHASE_HINT: Record<SweetPhase, string> = {
  Seed: "Client prep",
  Synthesize: "Our analysis",
  Session: "Live work",
  Sync: "Recap & confirm",
  Ship: "Delivered",
};

function OwnerChip({ owner }: { owner: SweetSession["phase_owner"] }) {
  if (!owner) return null;
  const map = {
    client: { label: "Client", Icon: Building2, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    us: { label: "Us", Icon: User, cls: "bg-iris/10 text-[color:var(--iris-violet)]" },
    both: { label: "Both", Icon: UsersIcon, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  } as const;
  const { label, Icon, cls } = map[owner];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

interface BoardProps {
  sessions: SweetSession[];
  emptyHint?: string;
  onMove?: (sessionId: string, newPhase: SweetPhase) => void;
}

export function SweetCycleBoard({ sessions, emptyHint, onMove }: BoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const grouped = useMemo(() => {
    const g: Record<SweetPhase, SweetSession[]> = {
      Seed: [], Synthesize: [], Session: [], Sync: [], Ship: [],
    };
    sessions.forEach((s) => {
      const ph = (s.sweetcycle_phase ?? "Seed") as SweetPhase;
      if (g[ph]) g[ph].push(s);
    });
    return g;
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {emptyHint ?? "No sessions yet for this service."}
      </div>
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || !onMove) return;
    const target = String(e.over.id) as SweetPhase;
    if (!PHASES.includes(target)) return;
    const id = String(e.active.id);
    const cur = sessions.find((s) => s.id === id);
    if (!cur || cur.sweetcycle_phase === target) return;
    onMove(id, target);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {PHASES.map((phase) => (
          <PhaseColumn key={phase} phase={phase} count={grouped[phase].length}>
            {grouped[phase].map((s) => (
              <DraggableSession key={s.id} session={s} draggable={Boolean(onMove)} />
            ))}
            {grouped[phase].length === 0 && (
              <div className="grid place-items-center rounded-lg border border-dashed border-border/50 px-2 py-4 text-[10px] text-muted-foreground/70">
                {onMove ? "Drop here" : "—"}
              </div>
            )}
          </PhaseColumn>
        ))}
      </div>
    </DndContext>
  );
}

function PhaseColumn({
  phase,
  count,
  children,
}: {
  phase: SweetPhase;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border border-border/50 bg-card/40 p-2.5 transition-colors",
        isOver && "border-[color:var(--iris-violet)]/60 bg-iris-soft/40",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <div className="text-xs font-semibold tracking-tight">{phase}</div>
          <div className="text-[10px] text-muted-foreground">{PHASE_HINT[phase]}</div>
        </div>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {count}
        </Badge>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DraggableSession({ session: s, draggable }: { session: SweetSession; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: s.id,
    disabled: !draggable,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const card = (
    <div
      className={cn(
        "block rounded-lg border border-border/50 bg-background p-2 text-xs shadow-sm transition-all hover:border-iris/40 hover:shadow-[var(--shadow-glow)]",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="line-clamp-2 font-medium leading-tight">{s.name}</div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <OwnerChip owner={s.phase_owner} />
        {s.phase_blocker && <AlertCircle className="h-3 w-3 text-rose-500" />}
      </div>
      {(s.phase_due_date || s.session_date) && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {s.phase_due_date ? `Due ${s.phase_due_date}` : s.session_date}
        </div>
      )}
    </div>
  );

  if (draggable) {
    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        <Link to="/sessions/$id" params={{ id: s.id }} onClick={(e) => isDragging && e.preventDefault()}>
          {card}
        </Link>
      </div>
    );
  }
  return (
    <Link to="/sessions/$id" params={{ id: s.id }}>
      {card}
    </Link>
  );
}
