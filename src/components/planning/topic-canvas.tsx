// Long-form prose canvas for a Topic. Single textarea, autosave on blur + debounce.
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check } from "lucide-react";
import {
  useThinkingItems,
  useCreateItem,
  useUpdateItem,
  type ThinkingItem,
} from "@/lib/use-thinking";

interface Props {
  topicId: string;
  onWordCountChange?: (n: number) => void;
  large?: boolean;
}

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function TopicCanvas({ topicId, onWordCountChange, large }: Props) {
  const { data: items = [] } = useThinkingItems(topicId);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const canvas = items.find((i) => i.kind === "canvas") as ThinkingItem | undefined;
  const [value, setValue] = useState<string>(canvas?.body ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setValue(canvas?.body ?? "");
  }, [canvas?.id]);

  const save = async (next: string) => {
    if (canvas) {
      await updateItem.mutateAsync({ id: canvas.id, topic_id: topicId, body: next });
    } else if (next.trim()) {
      await createItem.mutateAsync({ topic_id: topicId, kind: "canvas", body: next });
    }
    setSavedAt(Date.now());
  };

  const onChange = (next: string) => {
    setValue(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => save(next), 800);
  };

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Canvas</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </>
          ) : savedAt ? (
            <>
              <Check className="h-3 w-3" /> Saved
            </>
          ) : (
            <span>Autosaves as you type</span>
          )}
        </div>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => save(value)}
        placeholder="Write freely. Paste, draft, wrestle. No structure required."
        className="min-h-[260px] resize-y bg-background/60 leading-relaxed"
      />
    </div>
  );
}
