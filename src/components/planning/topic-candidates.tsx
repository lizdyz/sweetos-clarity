// Candidate proto-objects: write a candidate, tag with a kind, promote to canon.
// Promotion creates the real object and links back via promoted_to_kind/_id.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  useThinkingItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  type CandidateKind,
} from "@/lib/use-thinking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KIND_LABEL: Record<CandidateKind, string> = {
  quest: "?Quest",
  project: "?Project",
  decision: "?Decision",
  component: "?Component",
  jtbd: "?JTBD",
  kpi: "?KPI",
  task: "?Task",
};

const KIND_OPTIONS: CandidateKind[] = [
  "quest",
  "project",
  "decision",
  "component",
  "jtbd",
  "kpi",
  "task",
];

export function TopicCandidates({ topicId }: { topicId: string }) {
  const { data: items = [] } = useThinkingItems(topicId);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<CandidateKind>("quest");

  const candidates = items.filter((i) => i.kind === "candidate");

  const add = async () => {
    const body = draft.trim();
    if (!body) return;
    await createItem.mutateAsync({
      topic_id: topicId,
      kind: "candidate",
      body,
      candidate_kind: kind,
    });
    setDraft("");
  };

  const promote = async (c: typeof candidates[number], targetKind: CandidateKind) => {
    const body = c.body ?? "Untitled";
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id ?? "";
    let resultId: string | null = null;
    let resultKind = targetKind;

    try {
      switch (targetKind) {
        case "quest": {
          const { data, error } = await supabase
            .from("quests")
            .insert({
              name: body,
              description: "Promoted from Thinking Room.",
              created_by: userId,
            })
            .select()
            .single();
          if (error) throw error;
          resultId = data.id;
          break;
        }
        case "project": {
          const { data, error } = await supabase
            .from("projects")
            .insert({
              name: body,
              status: "Backlog",
              created_by: userId,
            })
            .select()
            .single();
          if (error) throw error;
          resultId = data.id;
          break;
        }
        case "decision": {
          const { data, error } = await supabase
            .from("decisions")
            .insert({
              decision: body,
              status: "open",
              context: "Promoted from Thinking Room.",
              created_by: userId,
            })
            .select()
            .single();
          if (error) throw error;
          resultId = data.id;
          break;
        }
        case "component": {
          const { data, error } = await supabase
            .from("components")
            .insert({
              name: body,
              description: "Promoted from Thinking Room.",
              created_by: userId,
            })
            .select()
            .single();
          if (error) throw error;
          resultId = data.id;
          break;
        }
        case "jtbd": {
          const { data, error } = await supabase
            .from("jobs_to_be_done")
            .insert({
              statement: body,
              created_by: userId,
            })
            .select()
            .single();
          if (error) throw error;
          resultId = data.id;
          break;
        }
        case "task": {
          const { data, error } = await supabase
            .from("tasks")
            .insert({
              name: body,
              status: "To Do",
              created_by: userId,
            })
            .select()
            .single();
          if (error) throw error;
          resultId = data.id;
          break;
        }
        case "kpi": {
          const { data, error } = await supabase
            .from("measures")
            .insert({
              name: body,
              kind: "kpi",
              subject_kind: "thinking_topic",
              subject_id: topicId,
              created_by: userId,
            })
            .select()
            .single();
          if (error) throw error;
          resultId = data.id;
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Could not promote to ${targetKind}: ${msg}`);
      return;
    }

    await updateItem.mutateAsync({
      id: c.id,
      topic_id: topicId,
      promoted_to_kind: resultKind,
      promoted_to_id: resultId,
    });
    toast.success(`Promoted to ${targetKind}`);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Candidates</h3>
      <p className="text-xs text-muted-foreground">
        Proto-objects you might promote to canon. Tag the kind, promote when ready.
      </p>
      <div className="space-y-1">
        {candidates.map((c) => (
          <div
            key={c.id}
            className="group flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm hover:border-border"
          >
            <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
              {KIND_LABEL[(c.candidate_kind ?? "quest") as CandidateKind]}
            </Badge>
            <span className="flex-1 whitespace-pre-wrap">{c.body}</span>
            {c.promoted_to_id ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> {c.promoted_to_kind}
              </span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs">
                    <ArrowRight className="mr-1 h-3 w-3" /> Promote
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {KIND_OPTIONS.map((k) => (
                    <DropdownMenuItem key={k} onClick={() => promote(c, k)}>
                      Promote to {k}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              className="opacity-0 transition group-hover:opacity-60 hover:opacity-100"
              onClick={() => deleteItem.mutate({ id: c.id, topic_id: topicId })}
              aria-label="Delete candidate"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {candidates.length === 0 && (
          <p className="text-xs text-muted-foreground">No candidates yet.</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as CandidateKind)}>
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Candidate idea…"
          className="h-9"
        />
        <Button size="sm" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
