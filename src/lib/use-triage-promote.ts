// Shared hook: promote a Triageable + show toast + invalidate caches.
// Used by every TriageCard mount in the app.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { promoteTriageable } from "@/lib/triage-promote";
import type { Triageable, PromoteActionKind } from "@/lib/triageable";

export function useTriagePromote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { item: Triageable; kind: PromoteActionKind; note?: string }) => {
      const res = await promoteTriageable(vars.item, vars.kind, { note: vars.note });
      if (!res.ok) throw new Error(res.message);
      return res;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      // Invalidate everything potentially touched. Cheap because indices are small.
      qc.invalidateQueries({ queryKey: ["sandbox_items"] });
      qc.invalidateQueries({ queryKey: ["sandbox-board"] });
      qc.invalidateQueries({ queryKey: ["sweetscan", "inbound"] });
      qc.invalidateQueries({ queryKey: ["sparks"] });
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["tasks-index"] });
      qc.invalidateQueries({ queryKey: ["ocda"] });
      qc.invalidateQueries({ queryKey: ["captures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
