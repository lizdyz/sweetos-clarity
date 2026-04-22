import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { EntityDef } from "@/lib/entities";

type Row = Record<string, unknown> & { id: string };

interface Props {
  entity: EntityDef;
  groupBy: string;
  columns: readonly string[];
  rows: Row[];
  onMove: (rowId: string, newValue: string) => void;
}

export function KanbanBoard({ entity, groupBy, columns, rows, onMove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {};
    columns.forEach((c) => (g[c] = []));
    const unassigned: Row[] = [];
    rows.forEach((r) => {
      const v = r[groupBy] as string | null | undefined;
      if (v && g[v]) g[v].push(r);
      else unassigned.push(r);
    });
    return { g, unassigned };
  }, [rows, columns, groupBy]);

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const target = String(e.over.id);
    const rowId = String(e.active.id);
    const current = rows.find((r) => r.id === rowId);
    if (!current) return;
    if (current[groupBy] === target) return;
    onMove(rowId, target);
  }

  const allColumns =
    grouped.unassigned.length > 0
      ? ["__unassigned", ...columns]
      : [...columns];

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {allColumns.map((col) => {
          const items =
            col === "__unassigned" ? grouped.unassigned : grouped.g[col] ?? [];
          return (
            <Column key={col} id={col} label={col === "__unassigned" ? "Unassigned" : col} count={items.length}>
              {items.map((row) => (
                <Card key={row.id} row={row} entity={entity} />
              ))}
              {items.length === 0 && (
                <div className="grid place-items-center rounded-lg border border-dashed border-border/60 px-3 py-5 text-[11px] text-muted-foreground">
                  Drop here
                </div>
              )}
            </Column>
          );
        })}
      </div>
    </DndContext>
  );
}

function Column({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface/60 p-2.5 transition-colors",
        isOver && "border-[color:var(--iris-violet)]/60 bg-iris-soft/30",
      )}
    >
      <div className="flex items-center justify-between px-1.5 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Card({ row, entity }: { row: Row; entity: EntityDef }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: row.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const headline = (row[entity.primaryField] as string) || "Untitled";
  const owner = (row.owner as string) || (row.created_by as string) || null;
  const due =
    (row.due_date as string) ||
    (row.deadline as string) ||
    (row.next_action_due as string) ||
    null;
  const conf = row.confidence as number | null;
  const source = row.source as string | null;
  const tags = (row.tagged_domains as string[] | null) ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={() => navigate({ to: `/${entity.key}/${row.id}` })}
      onClick={(e) => {
        if (isDragging) return;
        if (e.detail === 1) navigate({ to: `/${entity.key}/${row.id}` });
      }}
      className={cn(
        "cursor-grab rounded-xl border border-border bg-background p-2.5 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="line-clamp-2 font-medium text-foreground">{headline}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {owner && <span className="truncate">{owner}</span>}
        {due && (
          <>
            {owner && <span>·</span>}
            <span>{safeDate(due)}</span>
          </>
        )}
      </div>
      {(tags.length > 0 || conf || source) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {source && source !== "manual" && (
            <span className="rounded-md bg-iris-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              {source}
            </span>
          )}
          {typeof conf === "number" && (
            <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px]">
              {Math.round(conf * 100)}%
            </span>
          )}
          {tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function safeDate(s: string) {
  try {
    return format(new Date(s), "MMM d");
  } catch {
    return s;
  }
}
