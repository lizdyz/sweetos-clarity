import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Wand2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { sb } from "@/lib/sb";
import { PromptEditorSheet, type SystemPromptRow } from "@/components/prompt-editor-sheet";

export const Route = createFileRoute("/_app/settings/prompts")({
  component: PromptConsole,
});

const SCOPE_LABEL: Record<string, string> = {
  capture: "Capture & Queue",
  queue: "Capture & Queue",
  ocda: "OCDA Cockpit",
  scanner: "Signal Scanners",
  lens: "BizzyBot Lenses",
  curator: "Curator Agents",
};

function PromptConsole() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<SystemPromptRow | null>(null);
  const [open, setOpen] = useState(false);

  const { data: prompts = [] } = useQuery({
    queryKey: ["system_prompts"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("system_prompts")
        .select("*")
        .order("scope", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SystemPromptRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [prompts, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, SystemPromptRow[]>();
    for (const p of filtered) {
      const scope = p.scope ?? "other";
      const arr = m.get(scope) ?? [];
      arr.push(p);
      m.set(scope, arr);
    }
    return m;
  }, [filtered]);

  return (
    <div className="px-6 py-6">
      <PageHeader
        icon={<Wand2 className="h-5 w-5" />}
        title="Prompt Console"
        purpose="Every editable AI instruction in one place — capture parser, OCDA copilot, signal scanners, BizzyBot lenses, and curator agents."
        whatYouCanDo={[
          "Edit any prompt without redeploying",
          "Switch the model per prompt",
          "Track when each was last updated",
        ]}
      />
      <div className="mb-3">
        <Input
          placeholder="Search prompts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {Array.from(grouped.entries()).map(([scope, rows]) => (
        <div key={scope} className="mb-5">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {SCOPE_LABEL[scope] ?? scope}
          </div>
          <Card className="panel-raised divide-y divide-border/60 overflow-hidden p-0">
            {rows.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
                <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
                  {p.key}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  {p.description && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {p.description}
                    </div>
                  )}
                </div>
                <span className="hidden font-mono text-[10px] text-muted-foreground md:inline">
                  {p.model}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1"
                  onClick={() => {
                    setActive(p);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </div>
            ))}
          </Card>
        </div>
      ))}

      <PromptEditorSheet prompt={active} open={open} onOpenChange={setOpen} />
    </div>
  );
}
