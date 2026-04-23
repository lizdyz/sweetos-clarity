// /planning/think — the Thinking Room. 3-pane workbench with focus mode.
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Pin, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useThinkingTopics,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
  useThinkingItemCounts,
} from "@/lib/use-thinking";
import { TopicCanvas } from "@/components/planning/topic-canvas";
import { TopicPromptsStrip } from "@/components/planning/topic-prompts-strip";
import { TopicHeader } from "@/components/planning/topic-header";
import { TopicSideRail } from "@/components/planning/topic-side-rail";
import { TopicFocusShell } from "@/components/planning/topic-focus-shell";

export const Route = createFileRoute("/_app/planning/think")({
  component: ThinkingRoom,
});

const STARTER_TOPICS: Array<{
  title: string;
  description: string;
  prompts: string[];
}> = [
  {
    title: "Cash flow",
    description: "What revenue, by when, from where.",
    prompts: [
      "What revenue do we need by when?",
      "What can we sell now with what already exists?",
      "What are the constraints — capacity, sales cycle, capital?",
    ],
  },
  {
    title: "Service offering language",
    description: "What we call each service, who it's for, what outcome.",
    prompts: [
      "What do we call each service?",
      "Who is each service for — which persona, which moment?",
      "What outcome does each service produce?",
    ],
  },
  {
    title: "What to track",
    description: "KPIs and leading indicators that tell us we're winning.",
    prompts: [
      "What KPIs would tell us we're winning?",
      "What leading indicators show direction before the lagging ones?",
      "What's the smallest set we'd actually look at weekly?",
    ],
  },
];

function TopicRailRow({
  id,
  title,
  description,
  pinned,
  active,
  onClick,
  onTogglePin,
}: {
  id: string;
  title: string;
  description: string | null;
  pinned: boolean;
  active: boolean;
  onClick: () => void;
  onTogglePin: () => void;
}) {
  const counts = useThinkingItemCounts(id);
  const hasUnpromoted = counts.unpromotedCandidates > 0;
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition",
        active
          ? "border-primary/50 bg-primary/5"
          : "border-transparent hover:border-border hover:bg-muted/40",
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className="mt-0.5 shrink-0"
        aria-label={pinned ? "Unpin" : "Pin"}
      >
        <Pin
          className={cn(
            "h-3.5 w-3.5 transition",
            pinned
              ? "fill-primary text-primary"
              : "text-muted-foreground/30 opacity-0 group-hover:opacity-100",
          )}
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{title}</span>
          {hasUnpromoted && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              title={`${counts.unpromotedCandidates} unpromoted candidate${counts.unpromotedCandidates === 1 ? "" : "s"}`}
            />
          )}
        </div>
        {description && (
          <div className="truncate text-[11px] text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  );
}

function ThinkingRoom() {
  const { data: topics = [], isLoading } = useThinkingTopics();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [focused, setFocused] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // Seed starter topics on first visit if none exist.
  useEffect(() => {
    if (isLoading || seeded || topics.length > 0) return;
    setSeeded(true);
    (async () => {
      for (const s of STARTER_TOPICS) {
        await createTopic.mutateAsync({ title: s.title, description: s.description });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, topics.length, seeded]);

  // Auto-select first topic.
  useEffect(() => {
    if (!activeId && topics.length > 0) setActiveId(topics[0].id);
  }, [activeId, topics]);

  const active = topics.find((t) => t.id === activeId) ?? null;
  const starter = active ? STARTER_TOPICS.find((s) => s.title === active.title) : null;

  const { pinned, recent } = useMemo(() => {
    return {
      pinned: topics.filter((t) => t.pinned),
      recent: topics.filter((t) => !t.pinned),
    };
  }, [topics]);

  const addTopic = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const t = await createTopic.mutateAsync({ title });
    setNewTitle("");
    setActiveId(t.id);
  };

  const gridCols = focused
    ? "grid-cols-1"
    : "lg:grid-cols-[240px_1fr_320px]";

  return (
    <div className="space-y-4 px-6 pt-5 pb-10">
      {!focused && (
        <>
          <PageHeader
            title="Thinking Room"
            icon={<Brain className="h-5 w-5" />}
            purpose="A room to think — wrestle with cash flow, service language, what to track. Promote to canon when (and only when) you're ready."
            whatYouCanDo={[
              "Open a Topic and write freely on the canvas",
              "Jot loose notes and open questions",
              "Mark candidate Quests / Projects / Decisions / KPIs",
              "Promote candidates to canonical objects deliberately",
            ]}
            connectsTo={[
              { to: "/planning", label: "Planning (Seed mode)" },
              { to: "/decisions/open", label: "Open Decisions" },
              { to: "/quests", label: "Quests" },
            ]}
            nextSteps={["Open Cash flow and start writing"]}
          />

          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/planning"
              className="rounded-full border border-border/60 px-3 py-1 hover:border-border hover:bg-muted/40"
            >
              Seed
            </Link>
            <span className="rounded-full border border-primary bg-primary/10 px-3 py-1 font-medium text-primary">
              Think
            </span>
          </div>
        </>
      )}

      <div className={cn("grid gap-4", gridCols)}>
        {/* Topics rail */}
        {!focused && (
          <div className="space-y-3 rounded-2xl border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
                placeholder="New topic…"
                className="h-9"
              />
              <Button size="sm" variant="outline" onClick={addTopic} disabled={!newTitle.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-280px)] pr-1">
              <div className="space-y-3">
                {pinned.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      Pinned
                    </div>
                    {pinned.map((t) => (
                      <TopicRailRow
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        description={t.description}
                        pinned={t.pinned}
                        active={activeId === t.id}
                        onClick={() => setActiveId(t.id)}
                        onTogglePin={() =>
                          updateTopic.mutate({ id: t.id, pinned: !t.pinned })
                        }
                      />
                    ))}
                  </div>
                )}
                {recent.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      Recent
                    </div>
                    {recent.map((t) => (
                      <TopicRailRow
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        description={t.description}
                        pinned={t.pinned}
                        active={activeId === t.id}
                        onClick={() => setActiveId(t.id)}
                        onTogglePin={() =>
                          updateTopic.mutate({ id: t.id, pinned: !t.pinned })
                        }
                      />
                    ))}
                  </div>
                )}
                {topics.length === 0 && !isLoading && (
                  <p className="px-2 py-4 text-xs text-muted-foreground">No topics yet.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Canvas pane */}
        <div className="rounded-2xl border border-border bg-background/40 p-5">
          {active ? (
            <TopicFocusShell active={focused} onExit={() => setFocused(false)}>
              <div className="flex h-full flex-col gap-4">
                <TopicHeader
                  topic={active}
                  wordCount={wordCount}
                  focused={focused}
                  onToggleFocus={() => setFocused((f) => !f)}
                  onDeleted={() => setActiveId(null)}
                />

                {starter && starter.prompts.length > 0 && (
                  <TopicPromptsStrip prompts={starter.prompts} />
                )}

                <div className="min-h-[60vh] flex-1">
                  <TopicCanvas
                    topicId={active.id}
                    onWordCountChange={setWordCount}
                    large={focused}
                  />
                </div>
              </div>
            </TopicFocusShell>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a topic on the left, or create a new one.
            </p>
          )}
        </div>

        {/* Side rail */}
        {!focused && active && (
          <div className="rounded-2xl border border-border bg-background/40 p-3">
            <div className="h-[calc(100vh-220px)]">
              <TopicSideRail topicId={active.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
