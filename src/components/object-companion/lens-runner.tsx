import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Play, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { sb } from "@/lib/sb";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LensOutputsList } from "./lens-outputs-list";
import type { Lens, ObjectKind } from "@/lib/lens-types";

interface Props {
  lens: Lens;
  sourceKind: ObjectKind;
  sourceId: string;
  sourceTitle: string;
  sourceBody?: string | null;
  onBack: () => void;
}

/**
 * Detail view for a single lens, with Run button + structured outputs list.
 * Calls the existing `generate-lens-perspectives` edge function then synthesizes
 * 3-5 starter `lens_outputs` rows from the perspective so the user has something
 * to route. (The function returning structured_outputs natively is a future iter.)
 */
export function LensRunner({
  lens,
  sourceKind,
  sourceId,
  sourceTitle,
  sourceBody,
  onBack,
}: Props) {
  const qc = useQueryClient();
  const [hasRun, setHasRun] = useState(false);

  const run = useMutation({
    mutationFn: async () => {
      // Subjects supported by the edge function are: domain/tenet/component/relationship/mission/project.
      // For other object kinds, we fall back to a synthesized perspective stored directly as outputs.
      const supportedSubject = [
        "domain",
        "tenet",
        "component",
        "relationship",
        "mission",
        "project",
      ].includes(sourceKind);

      let perspectiveId: string | null = null;
      let nextActions: string[] = [];
      let watchOuts: string[] = [];
      let keyQuestions: string[] = [];

      if (supportedSubject) {
        const { data, error } = await supabase.functions.invoke("generate-lens-perspectives", {
          body: {
            subject_kind: sourceKind,
            subject_id: sourceId,
            lens_codes: [lens.code],
            force: true,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        // Re-fetch the latest perspective to harvest outputs from
        const { data: persp } = await sb
          .from("lens_perspectives")
          .select("id, key_questions, watch_outs, next_actions")
          .eq("lens_id", lens.id)
          .eq("subject_kind", sourceKind)
          .eq("subject_id", sourceId)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (persp) {
          perspectiveId = persp.id;
          nextActions = persp.next_actions ?? [];
          watchOuts = persp.watch_outs ?? [];
          keyQuestions = persp.key_questions ?? [];
        }
      } else {
        // Stub: emit starter prompts based on the lens's key questions
        keyQuestions = lens.stages.map((s) => `${s}: what stands out for "${sourceTitle}"?`);
        watchOuts = [
          `Watch: avoid forcing ${lens.name} where it doesn't fit.`,
        ];
      }

      // Synthesize structured outputs from the AI text
      const { data: u } = await sb.auth.getUser();
      const rows = [
        ...keyQuestions.slice(0, 3).map((q) => ({
          lens_id: lens.id,
          perspective_id: perspectiveId,
          source_kind: sourceKind,
          source_id: sourceId,
          kind: "observation",
          title: q,
          created_by: u.user?.id,
        })),
        ...watchOuts.slice(0, 3).map((w) => ({
          lens_id: lens.id,
          perspective_id: perspectiveId,
          source_kind: sourceKind,
          source_id: sourceId,
          kind: "risk",
          title: w,
          created_by: u.user?.id,
        })),
        ...nextActions.slice(0, 4).map((a) => ({
          lens_id: lens.id,
          perspective_id: perspectiveId,
          source_kind: sourceKind,
          source_id: sourceId,
          kind: "action",
          title: a,
          created_by: u.user?.id,
        })),
      ];
      if (rows.length > 0) {
        const { error: insErr } = await sb.from("lens_outputs").insert(rows);
        if (insErr) throw insErr;
      }
      return { count: rows.length, supportedSubject };
    },
    onSuccess: ({ count, supportedSubject }) => {
      setHasRun(true);
      qc.invalidateQueries({ queryKey: ["lens_outputs", sourceKind, sourceId] });
      toast.success(
        supportedSubject
          ? `${lens.name} ran — ${count} outputs ready to route`
          : `${lens.name} drafted ${count} starter outputs`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const accent = lens.accent_color || "var(--iris-violet)";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All lenses
      </button>

      <div className="rounded-xl border bg-card p-3">
        <div className="flex items-start gap-2.5">
          <span
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-base"
            style={{ backgroundColor: `${accent}20`, color: accent }}
          >
            {lens.bizzybot_emoji ?? "🔍"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
                {lens.code}
              </Badge>
              <h3 className="text-sm font-semibold">{lens.name}</h3>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{lens.tagline}</p>
          </div>
        </div>

        {lens.purpose && (
          <p className="mt-3 text-xs leading-relaxed">{lens.purpose}</p>
        )}

        <dl className="mt-3 grid gap-2 text-[11px]">
          {lens.core_intention && (
            <div>
              <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                Surfaces
              </dt>
              <dd>{lens.core_intention}</dd>
            </div>
          )}
          {lens.when_to_use && (
            <div>
              <dt className="font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Use when
              </dt>
              <dd>{lens.when_to_use}</dd>
            </div>
          )}
          {lens.when_not_to_use && (
            <div>
              <dt className="font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
                Avoid when
              </dt>
              <dd>{lens.when_not_to_use}</dd>
            </div>
          )}
        </dl>

        {lens.output_kinds && lens.output_kinds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lens.output_kinds.map((k) => (
              <Badge key={k} variant="secondary" className="text-[9px]">
                {k}
              </Badge>
            ))}
          </div>
        )}

        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={() => run.mutate()}
          disabled={run.isPending}
        >
          {run.isPending ? (
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
          ) : (
            <Play className="mr-1.5 h-3 w-3" />
          )}
          Run interrogation
        </Button>
      </div>

      <div>
        <h4 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="mr-1 inline h-2.5 w-2.5" /> Structured outputs
        </h4>
        <LensOutputsList sourceKind={sourceKind} sourceId={sourceId} lensId={lens.id} />
      </div>
    </div>
  );
}
