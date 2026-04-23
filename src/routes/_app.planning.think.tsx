// /planning/think — the Thinking Room.
// Free-form workbench. Topics on the left, active Topic detail on the right.
// Promotes deliberately to canonical objects (Quest, Project, Decision, etc).
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Pin, PinOff, Plus, Trash2 } from "lucide-react";
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
} from "@/lib/use-thinking";
import { TopicCanvas } from "@/components/planning/topic-canvas";
import { TopicNotes } from "@/components/planning/topic-notes";
import { TopicQuestions } from "@/components/planning/topic-questions";
import { TopicCandidates } from "@/components/planning/topic-candidates";
import { TopicLinked } from "@/components/planning/topic-linked";
import { TopicPromptCard } from "@/components/planning/topic-prompt-card";

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

function ThinkingRoom() {
  const { data: topics = [], isLoading } = useThinkingTopics();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [seeded, setSeeded] = useState(false);

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

  const addTopic = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const t = await createTopic.mutateAsync({ title });
    setNewTitle("");
    setActiveId(t.id);
  };

  return (
    <div className="space-y-4 px-6 pt-5 pb-10">
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

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Topics list */}
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
            <div className="space-y-1">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition",
                    activeId === t.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-transparent hover:border-border hover:bg-muted/40",
                  )}
                >
                  <Pin
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      t.pinned ? "fill-primary text-primary" : "text-muted-foreground/40",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{t.title}</div>
                    {t.description && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {t.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {topics.length === 0 && !isLoading && (
                <p className="px-2 py-4 text-xs text-muted-foreground">No topics yet.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Active topic detail */}
        <div className="rounded-2xl border border-border bg-background/40 p-5">
          {active ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{active.title}</h2>
                  {active.description && (
                    <p className="text-sm text-muted-foreground">{active.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateTopic.mutate({ id: active.id, pinned: !active.pinned })
                    }
                  >
                    {active.pinned ? (
                      <>
                        <PinOff className="mr-1 h-3.5 w-3.5" /> Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="mr-1 h-3.5 w-3.5" /> Pin
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete topic "${active.title}"?`)) {
                        deleteTopic.mutate(active.id);
                        setActiveId(null);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {starter && starter.prompts.length > 0 && (
                <div className="space-y-1.5">
                  {starter.prompts.map((p) => (
                    <TopicPromptCard key={p} question={p} />
                  ))}
                </div>
              )}

              <TopicCanvas topicId={active.id} />

              <div className="grid gap-5 md:grid-cols-2">
                <TopicNotes topicId={active.id} />
                <TopicQuestions topicId={active.id} />
              </div>

              <TopicCandidates topicId={active.id} />

              <TopicLinked topicId={active.id} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a topic on the left, or create a new one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
