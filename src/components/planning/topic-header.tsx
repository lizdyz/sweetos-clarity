// Topic header — inline-editable title/description, journey picker, pin/delete, saved timestamp.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pin, PinOff, Trash2, Maximize2, Minimize2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateTopic, useDeleteTopic, type ThinkingTopic } from "@/lib/use-thinking";
import { cn } from "@/lib/utils";

interface Props {
  topic: ThinkingTopic;
  wordCount: number;
  focused: boolean;
  onToggleFocus: () => void;
  onDeleted: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function TopicHeader({ topic, wordCount, focused, onToggleFocus, onDeleted }: Props) {
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();

  const [title, setTitle] = useState(topic.title);
  const [description, setDescription] = useState(topic.description ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  useEffect(() => {
    setTitle(topic.title);
    setDescription(topic.description ?? "");
  }, [topic.id, topic.title, topic.description]);

  const { data: journeys = [] } = useQuery({
    queryKey: ["journeys-for-topic-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journeys")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const saveTitle = () => {
    setEditingTitle(false);
    const next = title.trim() || topic.title;
    if (next !== topic.title) updateTopic.mutate({ id: topic.id, title: next });
  };
  const saveDesc = () => {
    setEditingDesc(false);
    const next = description.trim();
    if (next !== (topic.description ?? "")) {
      updateTopic.mutate({ id: topic.id, description: next || null });
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === "Escape") {
                  setTitle(topic.title);
                  setEditingTitle(false);
                }
              }}
              className="w-full rounded bg-transparent text-xl font-semibold text-foreground outline-none ring-1 ring-border focus:ring-primary"
            />
          ) : (
            <h2
              className="cursor-text truncate text-xl font-semibold text-foreground hover:text-primary"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {topic.title}
            </h2>
          )}

          {editingDesc ? (
            <input
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDesc}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === "Escape") {
                  setDescription(topic.description ?? "");
                  setEditingDesc(false);
                }
              }}
              placeholder="Add a one-line description…"
              className="mt-1 w-full rounded bg-transparent text-sm text-muted-foreground outline-none ring-1 ring-border focus:ring-primary"
            />
          ) : (
            <p
              className={cn(
                "mt-0.5 cursor-text truncate text-sm hover:text-foreground",
                topic.description ? "text-muted-foreground" : "text-muted-foreground/50 italic",
              )}
              onClick={() => setEditingDesc(true)}
              title="Click to edit"
            >
              {topic.description || "Add a one-line description…"}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>Saved {timeAgo(topic.updated_at)}</span>
            <span>·</span>
            <span>{wordCount} words</span>
            <span>·</span>
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              <Select
                value={topic.journey_id ?? "none"}
                onValueChange={(v) =>
                  updateTopic.mutate({
                    id: topic.id,
                    journey_id: v === "none" ? null : v,
                  })
                }
              >
                <SelectTrigger className="h-6 w-[180px] border-0 bg-transparent px-1 text-[11px] hover:bg-muted/40">
                  <SelectValue placeholder="No journey" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No journey</SelectItem>
                  {journeys.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggleFocus}>
                {focused ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{focused ? "Exit focus (Esc)" : "Focus mode"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => updateTopic.mutate({ id: topic.id, pinned: !topic.pinned })}
              >
                {topic.pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{topic.pinned ? "Unpin" : "Pin to top"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm(`Delete topic "${topic.title}"?`)) {
                    deleteTopic.mutate(topic.id);
                    onDeleted();
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete topic</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
