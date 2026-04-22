import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { toast } from "sonner";

interface Options {
  table: string;
  field: string;
  /** Query keys to invalidate after a successful update. */
  invalidate?: unknown[][];
  /** Friendly label used in toasts. */
  label?: string;
}

/**
 * Reusable mutation for "drag a card to a new column" or "click a cell to cycle".
 * Performs an optimistic-feeling update via React Query invalidation + toast.
 */
export function useDragToStatus({ table, field, invalidate = [], label }: Options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string | null }) => {
      const { error } = await sb.from(table).update({ [field]: value }).eq("id", id);
      if (error) throw error;
      return { id, value };
    },
    onSuccess: ({ value }) => {
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      toast.success(`${label ?? field} → ${value ?? "—"}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    },
  });
}
