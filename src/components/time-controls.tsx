import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { TimelineStrip } from "@/components/timeline-strip";
import { RecurrencePopover } from "@/components/recurrence-popover";
import { toast } from "sonner";

interface TimeControlsProps {
  table: string;
  rowId: string;
  invalidateKeys?: unknown[][];
  /** column for the "due" concept on this table (due_date or deadline). Defaults to due_date. */
  dueColumn?: "due_date" | "deadline" | "target_date";
  /** column for the "done" timestamp; defaults to done_at. */
  doneColumn?: "done_at" | null;
  className?: string;
  createdAt?: string | null;
  startedAt?: string | null;
  scheduledFor?: string | null;
  notBefore?: string | null;
  dueAt?: string | null;
  doneAt?: string | null;
  recurrenceRule?: string | null;
  showRecurrence?: boolean;
}

/**
 * Drop-in time controls for any actionable record.
 * Renders TimelineStrip (created/scheduled/not_before/due/done) inline-editable +
 * RecurrencePopover wired to recurrence_rule.
 */
export function TimeControls({
  table,
  rowId,
  invalidateKeys = [],
  dueColumn = "due_date",
  doneColumn = "done_at",
  className,
  createdAt,
  startedAt,
  scheduledFor,
  notBefore,
  dueAt,
  doneAt,
  recurrenceRule,
  showRecurrence = true,
}: TimeControlsProps) {
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from(table as never)
        .update(patch as never)
        .eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: [table] });
      qc.invalidateQueries({ queryKey: ["work_context"] });
      qc.invalidateQueries({ queryKey: ["time_grid"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <div className={className ?? "px-6"}>
      <div className="space-y-2">
        <TimelineStrip
          createdAt={createdAt ?? undefined}
          startedAt={startedAt ?? undefined}
          scheduledFor={scheduledFor ?? undefined}
          notBefore={notBefore ?? undefined}
          dueAt={dueAt ?? undefined}
          doneAt={doneAt ?? undefined}
          onChangeStarted={(v) => update.mutate({ started_at: v })}
          onChangeScheduled={(v) => update.mutate({ scheduled_for: v })}
          onChangeNotBefore={(v) => update.mutate({ not_before: v })}
          onChangeDue={(v) => update.mutate({ [dueColumn]: v })}
          onChangeDone={
            doneColumn
              ? (v) => update.mutate({ [doneColumn]: v ? new Date(v).toISOString() : null })
              : undefined
          }
        />
        {showRecurrence && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="uppercase tracking-wider">Recurrence</span>
            <RecurrencePopover
              value={recurrenceRule ?? null}
              onChange={(v) => update.mutate({ recurrence_rule: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
