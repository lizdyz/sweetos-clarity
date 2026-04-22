import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sb } from "@/lib/sb";
import { supabase } from "@/integrations/supabase/client";
import { LensPerspectiveCard } from "./lens-perspective-card";
import type {
  Lens,
  LensCanon,
  LensCardEntry,
  LensPerspective,
  LensSubjectKind,
} from "@/lib/lens-types";
import { toast } from "sonner";

interface LensWallProps {
  subjectKind: LensSubjectKind;
  subjectId: string;
  subjectLabel: string;
}

export function LensWall({ subjectKind, subjectId, subjectLabel }: LensWallProps) {
  const qc = useQueryClient();
  const [allOpen, setAllOpen] = useState(true);

  const { data: lenses } = useQuery({
    queryKey: ["lenses"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lenses")
        .select("*")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return data as Lens[];
    },
  });

  const { data: canon, isLoading: loadingCanon } = useQuery({
    queryKey: ["lens-canon", subjectKind, subjectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lens_canon")
        .select("*")
        .eq("subject_kind", subjectKind)
        .eq("subject_id", subjectId)
        .neq("status", "retired");
      if (error) throw error;
      return data as unknown as LensCanon[];
    },
  });

  const { data: perspectives, isLoading: loadingP } = useQuery({
    queryKey: ["lens-perspectives", subjectKind, subjectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lens_perspectives")
        .select("*")
        .eq("subject_kind", subjectKind)
        .eq("subject_id", subjectId)
        .order("version", { ascending: false });
      if (error) throw error;
      return data as unknown as LensPerspective[];
    },
  });

  const canonByLens = useMemo(() => {
    const map = new Map<string, LensCanon>();
    (canon ?? []).forEach((c) => {
      if (!map.has(c.lens_id)) map.set(c.lens_id, c);
    });
    return map;
  }, [canon]);

  const latestPerspectiveByLens = useMemo(() => {
    const map = new Map<string, LensPerspective>();
    (perspectives ?? []).forEach((p) => {
      if (!map.has(p.lens_id)) map.set(p.lens_id, p);
    });
    return map;
  }, [perspectives]);

  /** Canon is preferred. Fall back to latest AI perspective. */
  const cardEntryFor = (lensId: string): LensCardEntry | null => {
    const c = canonByLens.get(lensId);
    if (c) {
      return {
        tier: "canon",
        canon: c,
        quick_facts: c.quick_facts ?? [],
        perspective_md: c.perspective_md,
        key_questions: c.key_questions ?? [],
        watch_outs: c.watch_outs ?? [],
        next_actions: c.next_actions ?? [],
        stages_breakdown: c.stages_breakdown ?? [],
      };
    }
    const p = latestPerspectiveByLens.get(lensId);
    if (p) {
      return {
        tier: "generated",
        perspective: p,
        quick_facts: p.quick_facts ?? [],
        perspective_md: p.perspective_md,
        key_questions: p.key_questions ?? [],
        watch_outs: p.watch_outs ?? [],
        next_actions: p.next_actions ?? [],
        stages_breakdown: p.stages_breakdown ?? [],
      };
    }
    return null;
  };

  const generate = useMutation({
    mutationFn: async (force: boolean) => {
      const { data, error } = await supabase.functions.invoke("generate-lens-perspectives", {
        body: { subject_kind: subjectKind, subject_id: subjectId, force },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lens-perspectives", subjectKind, subjectId] });
      qc.invalidateQueries({ queryKey: ["crib-sheet", subjectKind, subjectId] });
      toast.success(`Generated ${data?.generated_count ?? 0} fresh AI Lens perspectives for ${subjectLabel}`);
    },
    onError: (e: Error) => {
      const msg = e.message;
      if (msg.includes("429")) toast.error("Rate limit hit — wait a moment and try again.");
      else if (msg.includes("402")) toast.error("AI credits exhausted — top up in Settings → Workspace → Usage.");
      else toast.error(msg);
    },
  });

  const isGenerating = generate.isPending;
  const hasAnyAI = (perspectives?.length ?? 0) > 0;
  const canonCount = canon?.length ?? 0;
  const totalLenses = lenses?.length ?? 0;
  const isLoading = loadingCanon || loadingP;

  return (
    <Card className="panel-raised p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Lens wall</h2>
          <p className="text-xs text-muted-foreground">
            Eight BizzyBots, each looking at <span className="font-medium text-foreground/80">{subjectLabel}</span> through their own lens.
            {totalLenses > 0 && (
              <> <span className="font-medium text-foreground/70">{canonCount}/{totalLenses}</span> have curated canon — AI fires only on demand.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setAllOpen((o) => !o)}
          >
            {allOpen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={() => generate.mutate(hasAnyAI)}
            disabled={isGenerating}
            title="Run all 8 BizzyBots to generate fresh AI perspectives. Costs credits — canon is shown by default."
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isGenerating ? "Generating…" : hasAnyAI ? "Re-run AI" : "Run AI for fresh angles"}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading lens canon…
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
          {(lenses ?? []).map((lens) => (
            <LensPerspectiveCard
              key={lens.id}
              lens={lens}
              entry={cardEntryFor(lens.id)}
              subjectKind={subjectKind}
              subjectId={subjectId}
              defaultOpen={allOpen}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
