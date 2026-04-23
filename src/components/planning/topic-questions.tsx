// Open questions list with "→ Decision" promote button per row.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  useThinkingItems,
  useCreateItem,
  useDeleteItem,
  useUpdateItem,
} from "@/lib/use-thinking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TopicQuestions({ topicId }: { topicId: string }) {
  const { data: items = [] } = useThinkingItems(topicId);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const [draft, setDraft] = useState("");

  const qs = items.filter((i) => i.kind === "question");

  const add = async () => {
    const body = draft.trim();
    if (!body) return;
    await createItem.mutateAsync({ topic_id: topicId, kind: "question", body });
    setDraft("");
  };

  const promoteToDecision = async (q: typeof qs[number]) => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("decisions")
      .insert({
        decision: q.body ?? "Untitled question",
        status: "open",
        context: `Promoted from Thinking Room.`,
        created_by: u.user?.id ?? "",
      })
      .select()
      .single();
    if (error) {
      toast.error(`Could not create Decision: ${error.message}`);
      return;
    }
    await updateItem.mutateAsync({
      id: q.id,
      topic_id: topicId,
      promoted_to_kind: "decision",
      promoted_to_id: data.id,
    });
    toast.success("Promoted to Decision");
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Open questions</h3>
      <div className="space-y-1">
        {qs.map((q) => (
          <div
            key={q.id}
            className="group flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm hover:border-border"
          >
            <span className="mt-1 text-muted-foreground">?</span>
            <span className="flex-1 whitespace-pre-wrap">{q.body}</span>
            {q.promoted_to_id ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Decision
              </span>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => promoteToDecision(q)}
              >
                <ArrowRight className="mr-1 h-3 w-3" /> Decision
              </Button>
            )}
            <button
              className="opacity-0 transition group-hover:opacity-60 hover:opacity-100"
              onClick={() => deleteItem.mutate({ id: q.id, topic_id: topicId })}
              aria-label="Delete question"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {qs.length === 0 && (
          <p className="text-xs text-muted-foreground">No open questions yet.</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="New open question…"
          className="h-9"
        />
        <Button size="sm" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
