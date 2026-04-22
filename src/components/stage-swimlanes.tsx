import { useMemo, type ReactNode } from "react";
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

export interface StageItem {
  id: string;
  stage: string | null;
}

interface Props<T extends StageItem> {
  columns: readonly string[];
  items: T[];
  onMove: (id: string, newStage: string) => void;
  renderCard: (item: T) => ReactNode;
  /** Optional subtitle under each column header. */
  hints?: Partial<Record<string, string>>;
}

export function StageSwimlanes<T extends StageItem>({
  columns,
  items,
  onMove,
  renderCard,
  hints,
}: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const grouped = useMemo(() => {
    const g: Record<string, T[]> = Object.fromEntries(columns.map((c) => [c, []]));
    const unassigned: T[] = [];
    items.forEach((it) => {
      const stage = normalize(it.stage, columns);
      if (stage && g[stage]) g[stage].push(it);
      else unassigned.push(it);
    });
    return { g, unassigned };
  }, [items, columns]);

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const target = String(e.over.id);
    const id = String(e.active.id);
    if (!columns.includes(target)) return;
    const cur = items.find((i) => i.id === id);
    if (!cur) return;
    if (normalize(cur.stage, columns) === target) return;
    onMove(id, target);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {columns.map((col) => (
          <Column key={col} id={col} label={col} hint={hints?.[col]} count={grouped.g[col].length}>
            {grouped.g[col].map((it) => (
              <DraggableCard key={it.id} id={it.id}>
                {renderCard(it)}
              </DraggableCard>
            ))}
            {grouped.g[col].length === 0 && (
              <div className="grid place-items-center rounded-lg border border-dashed border-border/50 px-2 py-4 text-[10px] text-muted-foreground/70">
                Drop here
              </div>
            )}
          </Column>
        ))}
      </div>
      {grouped.unassigned.length > 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-muted/20 p-2.5">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Unassigned ({grouped.unassigned.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {grouped.unassigned.map((it) => (
              <DraggableCard key={it.id} id={it.id}>
                {renderCard(it)}
              </DraggableCard>
            ))}
          </div>
        </div>
      )}
    </DndContext>
  );
}

function normalize(stage: string | null, columns: readonly string[]): string | null {
  if (!stage) return null;
  if (columns.includes(stage)) return stage;
  // tolerate "Pre-Mirror" → "Mirror" style: match by suffix word
  const lower = stage.toLowerCase();
  const hit = columns.find((c) => lower.includes(c.toLowerCase()));
  return hit ?? null;
}

function Column({
  id,
  label,
  hint,
  count,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-border/50 bg-card/40 p-2.5 transition-colors",
        isOver && "border-[color:var(--iris-violet)]/60 bg-iris-soft/40",
      )}
    >
      <div className="mb-1 flex items-center justify-between px-1">
        <div>
          <div className="text-xs font-semibold tracking-tight">{label}</div>
          {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
        </div>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {count}
        </Badge>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DraggableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-60")}
    >
      {children}
    </div>
  );
}
