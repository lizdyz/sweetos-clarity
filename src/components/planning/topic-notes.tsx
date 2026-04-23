// Quick-bullet notes list. Inline add, delete on hover.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  useThinkingItems,
  useCreateItem,
  useDeleteItem,
} from "@/lib/use-thinking";

export function TopicNotes({ topicId }: { topicId: string }) {
  const { data: items = [] } = useThinkingItems(topicId);
  const createItem = useCreateItem();
  const deleteItem = useDeleteItem();
  const [draft, setDraft] = useState("");

  const notes = items.filter((i) => i.kind === "note");

  const add = async () => {
    const body = draft.trim();
    if (!body) return;
    await createItem.mutateAsync({ topic_id: topicId, kind: "note", body });
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Notes</h3>
      <div className="space-y-1">
        {notes.map((n) => (
          <div
            key={n.id}
            className="group flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm hover:border-border"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <span className="flex-1 whitespace-pre-wrap">{n.body}</span>
            <button
              className="opacity-0 transition group-hover:opacity-60 hover:opacity-100"
              onClick={() => deleteItem.mutate({ id: n.id, topic_id: topicId })}
              aria-label="Delete note"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-xs text-muted-foreground">No notes yet — jot something below.</p>
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
          placeholder="New note…"
          className="h-9"
        />
        <Button size="sm" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
