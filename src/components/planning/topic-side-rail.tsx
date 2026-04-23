// Tabbed side rail: Notes / Questions / Candidates / Linked, each with count badge.
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TopicNotes } from "@/components/planning/topic-notes";
import { TopicQuestions } from "@/components/planning/topic-questions";
import { TopicCandidates } from "@/components/planning/topic-candidates";
import { TopicLinked } from "@/components/planning/topic-linked";
import { useThinkingItemCounts } from "@/lib/use-thinking";
import { cn } from "@/lib/utils";

function CountBadge({ value, active }: { value: number; active: boolean }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-medium",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}

export function TopicSideRail({ topicId }: { topicId: string }) {
  const counts = useThinkingItemCounts(topicId);

  return (
    <Tabs defaultValue="notes" className="flex h-full flex-col">
      <TabsList className="grid w-full grid-cols-4 bg-muted/40">
        {(["notes", "questions", "candidates", "linked"] as const).map((k) => (
          <TabsTrigger key={k} value={k} className="text-xs capitalize">
            {k}
            <CountBadge value={counts[k]} active={false} />
          </TabsTrigger>
        ))}
      </TabsList>
      <ScrollArea className="mt-3 flex-1 pr-2">
        <TabsContent value="notes" className="mt-0">
          <TopicNotes topicId={topicId} />
        </TabsContent>
        <TabsContent value="questions" className="mt-0">
          <TopicQuestions topicId={topicId} />
        </TabsContent>
        <TabsContent value="candidates" className="mt-0">
          <TopicCandidates topicId={topicId} />
        </TabsContent>
        <TabsContent value="linked" className="mt-0">
          <TopicLinked topicId={topicId} />
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}
