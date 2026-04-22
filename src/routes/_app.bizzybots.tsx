import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";

export const Route = createFileRoute("/_app/bizzybots")({
  component: BizzyBotsPage,
});

interface Lens {
  id: string;
  code: string;
  name: string;
  tagline: string;
  accent_color: string;
  bizzybot_emoji: string | null;
  stages: string[];
  best_use: string | null;
}

function BizzyBotsPage() {
  const { data: lenses = [] } = useQuery({
    queryKey: ["bizzybots-gallery"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lenses")
        .select("id, code, name, tagline, accent_color, bizzybot_emoji, stages, best_use")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Lens[];
    },
  });

  return (
    <div className="px-6 py-6">
      <PageHeader
        icon={<Bot className="h-5 w-5" />}
        title="BizzyBots"
        purpose="Nine Lens agents — each looks at a subject through one canonical perspective. Open one to ask it about any Domain, Tenet, Project, Component, or Relationship."
        whatYouCanDo={[
          "Browse the 9 BizzyBots",
          "Open one to apply it to any subject",
          "Edit prompts in Settings → Prompt Console",
        ]}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lenses.map((l) => (
          <Card key={l.id} className="panel-raised flex items-start gap-3 p-4">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl shadow-[var(--shadow-glass)]"
              style={{ background: `${l.accent_color}22`, color: l.accent_color }}
            >
              {l.bizzybot_emoji ?? "✨"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-4 px-1 text-[9px]">
                  {l.code}
                </Badge>
                <span className="truncate text-sm font-semibold tracking-tight">{l.name}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{l.tagline}</p>
              {l.best_use && (
                <p className="mt-1.5 line-clamp-2 text-[10px] text-foreground/70">{l.best_use}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{l.stages.length} stages</span>
                <Link
                  to="/settings/lenses/$id"
                  params={{ id: l.id }}
                  className="text-[11px] font-medium text-[color:var(--iris-violet)] hover:underline"
                >
                  Edit →
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
