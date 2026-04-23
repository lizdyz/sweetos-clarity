// Linked existing canonical objects. v1: search Quests, Projects, Decisions, Components.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Search, X, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useThinkingItems,
  useCreateItem,
  useDeleteItem,
} from "@/lib/use-thinking";
import { supabase } from "@/integrations/supabase/client";

type LinkKind = "quest" | "project" | "decision" | "component";

const LINK_TABLES: Record<LinkKind, { table: string; nameCol: string; route: string }> = {
  quest: { table: "quests", nameCol: "name", route: "/quests" },
  project: { table: "projects", nameCol: "name", route: "/projects" },
  decision: { table: "decisions", nameCol: "decision", route: "/decisions" },
  component: { table: "components", nameCol: "name", route: "/components" },
};

export function TopicLinked({ topicId }: { topicId: string }) {
  const { data: items = [] } = useThinkingItems(topicId);
  const createItem = useCreateItem();
  const deleteItem = useDeleteItem();
  const [kind, setKind] = useState<LinkKind>("quest");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string }>>([]);

  const linked = items.filter((i) => i.kind === "linked");

  const search = async () => {
    const cfg = LINK_TABLES[kind];
    const { data, error } = await (supabase
      .from(cfg.table as never) as never)
      .select(`id, ${cfg.nameCol}`)
      .ilike(cfg.nameCol, `%${q}%`)
      .limit(8);
    if (error) return;
    setResults(
      ((data ?? []) as Array<Record<string, string>>).map((r) => ({
        id: r.id,
        name: r[cfg.nameCol],
      })),
    );
  };

  const attach = async (r: { id: string; name: string }) => {
    await createItem.mutateAsync({
      topic_id: topicId,
      kind: "linked",
      body: r.name,
      linked_kind: kind,
      linked_id: r.id,
    });
    setQ("");
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Linked objects</h3>
      <div className="space-y-1">
        {linked.map((l) => {
          const cfg = LINK_TABLES[(l.linked_kind ?? "quest") as LinkKind];
          return (
            <div
              key={l.id}
              className="group flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm hover:border-border"
            >
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {l.linked_kind}
              </Badge>
              <span className="flex-1 truncate">{l.body}</span>
              {l.linked_id && (
                <Link
                  to={`${cfg.route}/$id`}
                  params={{ id: l.linked_id }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              <button
                className="opacity-0 transition group-hover:opacity-60 hover:opacity-100"
                onClick={() => deleteItem.mutate({ id: l.id, topic_id: topicId })}
                aria-label="Unlink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {linked.length === 0 && (
          <p className="text-xs text-muted-foreground">Nothing linked yet.</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as LinkKind)}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quest">Quest</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="decision">Decision</SelectItem>
            <SelectItem value="component">Component</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder={`Search ${kind}s…`}
          className="h-9"
        />
        <Button size="sm" variant="outline" onClick={search} disabled={!q.trim()}>
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>
      {results.length > 0 && (
        <div className="space-y-1 rounded-md border border-border/40 bg-muted/30 p-2">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => attach(r)}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-background"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
