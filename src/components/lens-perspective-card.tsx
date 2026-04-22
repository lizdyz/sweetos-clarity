import { useState } from "react";
import { ChevronDown, Pin, PinOff, Sparkles, BookOpenCheck, ArrowUpToLine, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { sb } from "@/lib/sb";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { BizzybotAvatar } from "./bizzybot-avatar";
import { LensStageStepper } from "./lens-stage-stepper";
import type { Lens, LensCardEntry, LensSubjectKind } from "@/lib/lens-types";
import { toast } from "sonner";

interface Props {
  lens: Lens;
  entry: LensCardEntry | null;
  subjectKind: LensSubjectKind;
  subjectId: string;
  defaultOpen?: boolean;
}

export function LensPerspectiveCard({ lens, entry, subjectKind, subjectId, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [stageIndex, setStageIndex] = useState(0);
  const qc = useQueryClient();

  const accent = lens.accent_color;
  const stagesBreakdown = entry?.stages_breakdown ?? [];
  const hasStages = stagesBreakdown.length > 0;
  const activeStage = hasStages ? stagesBreakdown[Math.min(stageIndex, stagesBreakdown.length - 1)] : null;

  const generateOne = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-lens-perspectives", {
        body: { subject_kind: subjectKind, subject_id: subjectId, lens_codes: [lens.code], force: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-perspectives", subjectKind, subjectId] });
      toast.success(`${lens.name} — fresh AI perspective generated`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const promoteToCanon = useMutation({
    mutationFn: async () => {
      if (entry?.tier !== "generated" || !entry.perspective) return;
      const p = entry.perspective;
      // Upsert into lens_canon for this (lens, subject) pair
      const { error } = await sb
        .from("lens_canon")
        .upsert(
          {
            lens_id: lens.id,
            subject_kind: subjectKind,
            subject_id: subjectId,
            quick_facts: p.quick_facts,
            perspective_md: p.perspective_md,
            key_questions: p.key_questions,
            watch_outs: p.watch_outs,
            next_actions: p.next_actions,
            stages_breakdown: p.stages_breakdown,
            source: "promoted_from_ai",
            promoted_from_perspective_id: p.id,
            status: "active",
          },
          { onConflict: "lens_id,subject_kind,subject_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-canon", subjectKind, subjectId] });
      toast.success(`${lens.name} — promoted to canon`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async () => {
      if (entry?.tier !== "generated" || !entry.perspective) return;
      const { error } = await sb
        .from("lens_perspectives")
        .update({ is_pinned: !entry.perspective.is_pinned })
        .eq("id", entry.perspective.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-perspectives", subjectKind, subjectId] });
      toast.success(entry?.perspective?.is_pinned ? "Unpinned" : "Pinned — AI re-runs will skip this lens");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tier = entry?.tier ?? "empty";

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card transition-shadow hover:shadow-[var(--shadow-glass)]"
      style={{
        backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${accent} 6%, transparent) 0%, transparent 60%)`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <BizzybotAvatar emoji={lens.bizzybot_emoji} accentColor={accent} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {lens.code}
            </span>
            <h3 className="truncate text-sm font-semibold tracking-tight">{lens.name}</h3>
            <TierChip tier={tier} canonStatus={entry?.canon?.status} />
          </div>
          <p className="truncate text-xs text-muted-foreground">{lens.tagline}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && hasStages && (
        <LensStageStepper
          stages={stagesBreakdown}
          activeIndex={Math.min(stageIndex, stagesBreakdown.length - 1)}
          onChange={setStageIndex}
          accent={accent}
        />
      )}

      {open && (
        <div className="p-4">
          {!entry ? (
            <div className="space-y-3">
              <p className="text-xs italic text-muted-foreground">
                No canonical perspective yet. Author one in <span className="font-medium">Settings → Lens Canon</span>, or generate an AI take below.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => generateOne.mutate()}
                disabled={generateOne.isPending}
              >
                {generateOne.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Generate with AI
              </Button>
            </div>
          ) : hasStages && activeStage ? (
            <>
              {entry.quick_facts.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {entry.quick_facts.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}

              <h4 className="mb-1 text-sm font-semibold tracking-tight" style={{ color: accent }}>
                {activeStage.stage}
              </h4>
              {activeStage.summary && (
                <p className="mb-3 text-sm leading-relaxed text-foreground/85">{activeStage.summary}</p>
              )}

              {activeStage.bullets.length > 0 && (
                <BulletList items={activeStage.bullets} accent={accent} />
              )}

              {(activeStage.watch_outs.length > 0 || activeStage.next_actions.length > 0) && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {activeStage.watch_outs.length > 0 && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Watch-outs
                      </div>
                      <BulletList items={activeStage.watch_outs} warn />
                    </div>
                  )}
                  {activeStage.next_actions.length > 0 && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Next actions
                      </div>
                      <BulletList items={activeStage.next_actions} accent={accent} />
                    </div>
                  )}
                </div>
              )}

              <Footer
                entry={entry}
                onTogglePin={() => togglePin.mutate()}
                pinning={togglePin.isPending}
                onPromote={() => promoteToCanon.mutate()}
                promoting={promoteToCanon.isPending}
                onGenerate={() => generateOne.mutate()}
                generating={generateOne.isPending}
              />
            </>
          ) : (
            <>
              {entry.quick_facts.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {entry.quick_facts.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
              <Tabs defaultValue="perspective" className="w-full">
                <TabsList className="h-8">
                  <TabsTrigger value="perspective" className="text-xs">Perspective</TabsTrigger>
                  <TabsTrigger value="questions" className="text-xs">Questions</TabsTrigger>
                  <TabsTrigger value="watch" className="text-xs">Watch-outs</TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs">Next</TabsTrigger>
                </TabsList>
                <TabsContent value="perspective" className="mt-3">
                  <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground/85 [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5">
                    <RenderMarkdown md={entry.perspective_md ?? ""} />
                  </div>
                </TabsContent>
                <TabsContent value="questions" className="mt-3">
                  <BulletList items={entry.key_questions} />
                </TabsContent>
                <TabsContent value="watch" className="mt-3">
                  <BulletList items={entry.watch_outs} warn />
                </TabsContent>
                <TabsContent value="actions" className="mt-3">
                  <BulletList items={entry.next_actions} accent={accent} />
                </TabsContent>
              </Tabs>
              <Footer
                entry={entry}
                onTogglePin={() => togglePin.mutate()}
                pinning={togglePin.isPending}
                onPromote={() => promoteToCanon.mutate()}
                promoting={promoteToCanon.isPending}
                onGenerate={() => generateOne.mutate()}
                generating={generateOne.isPending}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TierChip({ tier, canonStatus }: { tier: "canon" | "generated" | "empty"; canonStatus?: string }) {
  if (tier === "canon") {
    const isDraft = canonStatus === "draft";
    return (
      <Badge
        variant="outline"
        className={cn(
          "h-5 gap-1 px-1.5 text-[10px]",
          isDraft
            ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300"
            : "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
        )}
        title={isDraft ? "Starter canon — refine to make it real." : "Curated best-practice canon"}
      >
        <BookOpenCheck className="h-3 w-3" />
        {isDraft ? "Canon · draft" : "Canon"}
      </Badge>
    );
  }
  if (tier === "generated") {
    return (
      <Badge
        variant="outline"
        className="h-5 gap-1 border-violet-500/40 bg-violet-500/5 px-1.5 text-[10px] text-violet-700 dark:text-violet-300"
        title="AI-generated. Promote to canon if it's good enough to keep."
      >
        <Sparkles className="h-3 w-3" />
        AI
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground" title="No perspective yet">
      Empty
    </Badge>
  );
}

function Footer({
  entry,
  onTogglePin,
  pinning,
  onPromote,
  promoting,
  onGenerate,
  generating,
}: {
  entry: LensCardEntry;
  onTogglePin: () => void;
  pinning: boolean;
  onPromote: () => void;
  promoting: boolean;
  onGenerate: () => void;
  generating: boolean;
}) {
  if (entry.tier === "canon") {
    const c = entry.canon!;
    const updated = new Date(c.updated_at).toLocaleDateString();
    return (
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
        <span title={c.notes ?? undefined}>
          Curated · {c.source === "promoted_from_ai" ? "promoted from AI" : "hand-authored"} · updated {updated}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[10px]"
          onClick={onGenerate}
          disabled={generating}
          title="Generate a fresh AI take alongside the canon (costs credits)."
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Fresh AI angle
        </Button>
      </div>
    );
  }
  const p = entry.perspective!;
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
      <span>
        AI v{p.version} · {new Date(p.generated_at).toLocaleDateString()} ·{" "}
        {p.generated_by_model ?? "AI"}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[10px]"
          onClick={onPromote}
          disabled={promoting}
          title="Promote this AI take into the curated canon for this subject."
        >
          {promoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpToLine className="h-3 w-3" />}
          Promote to canon
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[10px]"
          onClick={onTogglePin}
          disabled={pinning}
        >
          {p.is_pinned ? (
            <><PinOff className="h-3 w-3" /> Unpin</>
          ) : (
            <><Pin className="h-3 w-3" /> Pin</>
          )}
        </Button>
      </div>
    </div>
  );
}

function BulletList({ items, warn, accent }: { items: string[]; warn?: boolean; accent?: string }) {
  if (!items.length) return <p className="text-xs italic text-muted-foreground">None.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: warn ? "var(--warning)" : accent ?? "var(--iris-violet)" }}
          />
          <span className="text-foreground/80">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function RenderMarkdown({ md }: { md: string }) {
  const blocks = md.split(/\n\n+/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isList) {
          return (
            <ul key={bi}>
              {lines.map((l, i) => (
                <li key={i}>{l.replace(/^\s*[-*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        const isHeading = /^#{1,4}\s+/.test(lines[0]);
        if (isHeading) {
          const text = lines[0].replace(/^#+\s+/, "");
          return <h4 key={bi} className="text-sm font-semibold">{text}</h4>;
        }
        return <p key={bi}>{block}</p>;
      })}
    </>
  );
}
