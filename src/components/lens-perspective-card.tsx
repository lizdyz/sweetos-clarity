import { useState } from "react";
import { ChevronDown, Pin, PinOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { BizzybotAvatar } from "./bizzybot-avatar";
import { LensStageStepper } from "./lens-stage-stepper";
import type { Lens, LensPerspective, LensSubjectKind } from "@/lib/lens-types";
import { toast } from "sonner";

interface Props {
  lens: Lens;
  perspective: LensPerspective | null;
  subjectKind: LensSubjectKind;
  subjectId: string;
  defaultOpen?: boolean;
}

export function LensPerspectiveCard({ lens, perspective, subjectKind, subjectId, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [stageIndex, setStageIndex] = useState(0);
  const qc = useQueryClient();

  const togglePin = useMutation({
    mutationFn: async () => {
      if (!perspective) return;
      const { error } = await sb
        .from("lens_perspectives")
        .update({ is_pinned: !perspective.is_pinned })
        .eq("id", perspective.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-perspectives", subjectKind, subjectId] });
      toast.success(perspective?.is_pinned ? "Unpinned" : "Pinned — AI re-runs will skip this lens");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const accent = lens.accent_color;
  const stagesBreakdown = perspective?.stages_breakdown ?? [];
  const hasStages = stagesBreakdown.length > 0;
  const activeStage = hasStages ? stagesBreakdown[Math.min(stageIndex, stagesBreakdown.length - 1)] : null;

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
          {!perspective ? (
            <p className="text-xs italic text-muted-foreground">
              Not yet generated. Click <em>Generate Lens perspectives</em> at the top.
            </p>
          ) : hasStages && activeStage ? (
            <>
              {perspective.quick_facts.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {perspective.quick_facts.map((f, i) => (
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

              <Footer perspective={perspective} togglePin={() => togglePin.mutate()} pinning={togglePin.isPending} />
            </>
          ) : (
            <>
              {perspective.quick_facts.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {perspective.quick_facts.map((f, i) => (
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
                    <RenderMarkdown md={perspective.perspective_md ?? ""} />
                  </div>
                </TabsContent>
                <TabsContent value="questions" className="mt-3">
                  <BulletList items={perspective.key_questions} />
                </TabsContent>
                <TabsContent value="watch" className="mt-3">
                  <BulletList items={perspective.watch_outs} warn />
                </TabsContent>
                <TabsContent value="actions" className="mt-3">
                  <BulletList items={perspective.next_actions} accent={accent} />
                </TabsContent>
              </Tabs>
              <Footer perspective={perspective} togglePin={() => togglePin.mutate()} pinning={togglePin.isPending} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Footer({ perspective, togglePin, pinning }: { perspective: LensPerspective; togglePin: () => void; pinning: boolean }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
      <span>
        v{perspective.version} · {new Date(perspective.generated_at).toLocaleDateString()} ·{" "}
        {perspective.generated_by_model ?? "AI"}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-2 text-[10px]"
        onClick={togglePin}
        disabled={pinning}
      >
        {perspective.is_pinned ? (
          <><PinOff className="h-3 w-3" /> Unpin</>
        ) : (
          <><Pin className="h-3 w-3" /> Pin</>
        )}
      </Button>
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
