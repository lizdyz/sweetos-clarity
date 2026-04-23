// Universal OCDA stage chip — click to advance any subject through
// Observe → Choose → Decide → Act → Done. The same chip mounts on every
// actionable detail surface so OCDA stops being a passive label and starts
// behaving like a real pipeline. See `mem://design/ocda-as-pipeline.md`.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, GitFork, Gavel, Zap, Check, ChevronDown, Loader2 } from "lucide-react";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type OCDAStage = "observe" | "choose" | "decide" | "act" | "done";

const STAGES: { key: OCDAStage; label: string; icon: typeof Eye; tone: string; verb: string }[] = [
  { key: "observe", label: "Observe", icon: Eye, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", verb: "Frame what you see" },
  { key: "choose", label: "Choose", icon: GitFork, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", verb: "Weigh the options" },
  { key: "decide", label: "Decide", icon: Gavel, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", verb: "Log the decision" },
  { key: "act", label: "Act", icon: Zap, tone: "bg-iris-soft text-iris border-iris/30", verb: "Move it forward" },
  { key: "done", label: "Done", icon: Check, tone: "bg-muted text-muted-foreground border-border", verb: "Record the outcome" },
];

interface OCDAStageChipProps {
  /** Database table name. Common: 'tasks', 'projects', 'decisions', 'sparks', 'proposals'. */
  subjectTable: string;
  subjectId: string;
  stage: OCDAStage | string | null;
  /** React Query keys to invalidate on success. */
  invalidate?: unknown[][];
  className?: string;
  /** When true, render as a small read-only badge with no menu. */
  readonly?: boolean;
  /** Override the column name (defaults to "ocda_stage"). */
  column?: string;
}

export function OCDAStageChip({
  subjectTable,
  subjectId,
  stage,
  invalidate = [],
  className,
  readonly,
  column = "ocda_stage",
}: OCDAStageChipProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const current =
    STAGES.find((s) => s.key === (stage ?? "").toLowerCase()) ?? STAGES[0];
  const Icon = current.icon;

  const mut = useMutation({
    mutationFn: async (next: OCDAStage) => {
      const { error } = await sb
        .from(subjectTable)
        .update({ [column]: next })
        .eq("id", subjectId);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(`OCDA → ${STAGES.find((s) => s.key === next)?.label}`);
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      qc.invalidateQueries({ queryKey: ["ocda"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (readonly) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
          current.tone,
          className,
        )}
      >
        <Icon className="h-3 w-3" /> {current.label}
      </span>
    );
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        disabled={mut.isPending}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition hover:opacity-80",
          current.tone,
        )}
        title={`OCDA stage — ${current.verb}`}
      >
        {mut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
        <span>OCDA · {current.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border bg-popover shadow-lg">
            <div className="border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Advance OCDA stage
            </div>
            {STAGES.map((s) => {
              const SIcon = s.icon;
              const active = s.key === current.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!active) mut.mutate(s.key);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-iris-soft/50",
                    active && "bg-muted/40",
                  )}
                >
                  <SIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">
                    <span className="block font-semibold">{s.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{s.verb}</span>
                  </span>
                  {active && <Check className="mt-0.5 h-3.5 w-3.5 text-iris" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
