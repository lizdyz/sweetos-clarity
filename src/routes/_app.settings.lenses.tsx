import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BizzybotAvatar } from "@/components/bizzybot-avatar";
import { PageHeader } from "@/components/page-header";
import type { Lens } from "@/lib/lens-types";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/settings/lenses")({
  component: LensesAdminPage,
});

function LensesAdminPage() {
  const { data: lenses } = useQuery({
    queryKey: ["lenses", "admin"],
    queryFn: async () => {
      const { data, error } = await sb.from("lenses").select("*").order("sort_order");
      if (error) throw error;
      return data as Lens[];
    },
  });

  return (
    <div className="space-y-5 px-6 py-6">
      <PageHeader
        title="BizzyBot prompts"
        purpose="Author the system instructions, prompt templates, and model for each Lens. The next time a perspective is generated, your prompt is what runs."
        whatYouCanDo={[
          "Edit a BizzyBot's system prompt and user prompt template",
          "Pick the AI model (Gemini Flash / Pro / GPT-5)",
          "Reorder stages and tweak tagline / what-it-asks",
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {(lenses ?? []).map((lens) => (
          <Link
            key={lens.id}
            to="/settings/lenses/$id"
            params={{ id: lens.id }}
            className="block"
          >
            <Card
              className="panel-raised flex items-center gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-glass)]"
              style={{
                backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${lens.accent_color} 6%, transparent) 0%, transparent 60%)`,
              }}
            >
              <BizzybotAvatar emoji={lens.bizzybot_emoji} accentColor={lens.accent_color} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {lens.code}
                  </span>
                  <h3 className="truncate text-sm font-semibold">{lens.name}</h3>
                  {lens.system_prompt && (
                    <Badge variant="secondary" className="text-[9px]">Custom prompt</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{lens.tagline}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                  <span>{lens.stages.length} stages</span>
                  <span>·</span>
                  <span className="font-mono">{lens.model ?? "default"}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
