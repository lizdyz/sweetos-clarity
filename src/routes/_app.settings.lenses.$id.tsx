import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BizzybotAvatar } from "@/components/bizzybot-avatar";
import { PageHeader } from "@/components/page-header";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Lens } from "@/lib/lens-types";

export const Route = createFileRoute("/_app/settings/lenses/$id")({
  component: LensEditor,
});

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (fast, balanced)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (cheapest)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (deepest reasoning)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (balanced)" },
  { value: "openai/gpt-5", label: "GPT-5 (top-tier)" },
];

const DEFAULT_SYSTEM = (lens: Lens) =>
  `You are the ${lens.name} BizzyBot — the embodiment of the ${lens.name} Lens (${lens.tagline}).
Your stages are: ${lens.stages.join(" → ")}.
What you ask: ${lens.what_it_asks ?? ""}
Best use: ${lens.best_use ?? ""}

You must walk the subject through YOUR stages, producing ONE structured entry per stage. Be specific, operational, and grounded in the subject's actual content. Avoid generic advice. Use concrete language. Keep each stage's bullets tight and punchy.`;

const DEFAULT_USER = `Subject ({{subject_kind}}): {{subject_name}}
Description: {{subject_description}}

Generate your per-stage perspective. Produce exactly one entry per stage, in order: {{stages}}.`;

function LensEditor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: lens, isLoading } = useQuery({
    queryKey: ["lens", id],
    queryFn: async () => {
      const { data, error } = await sb.from("lenses").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Lens;
    },
  });

  const [systemPrompt, setSystemPrompt] = useState("");
  const [userTemplate, setUserTemplate] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");

  useEffect(() => {
    if (!lens) return;
    setSystemPrompt(lens.system_prompt ?? "");
    setUserTemplate(lens.user_prompt_template ?? "");
    setModel(lens.model ?? "google/gemini-2.5-flash");
  }, [lens]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await sb
        .from("lenses")
        .update({
          system_prompt: systemPrompt.trim() || null,
          user_prompt_template: userTemplate.trim() || null,
          model,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens", id] });
      qc.invalidateQueries({ queryKey: ["lenses"] });
      qc.invalidateQueries({ queryKey: ["lenses", "admin"] });
      toast.success("Saved — next generation will use this prompt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !lens) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const usingDefaultSystem = !systemPrompt.trim();
  const usingDefaultUser = !userTemplate.trim();

  return (
    <div className="space-y-5 px-6 py-6">
      <Link to="/settings/lenses" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All BizzyBots
      </Link>

      <PageHeader
        title={`${lens.code} · ${lens.name}`}
        purpose={lens.tagline}
        whatYouCanDo={[
          "Override the system prompt (leave blank to use default)",
          "Use {{subject_name}}, {{subject_description}}, {{subject_kind}}, {{stages}} in the user template",
          "Pick the AI model — Gemini Flash for speed, Pro for depth",
        ]}
      />

      <Card className="panel-raised flex items-start gap-4 p-5"
        style={{
          backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${lens.accent_color} 6%, transparent) 0%, transparent 60%)`,
        }}
      >
        <BizzybotAvatar emoji={lens.bizzybot_emoji} accentColor={lens.accent_color} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{lens.name}</h2>
            <Badge variant="outline" className="font-mono text-[10px]">{lens.code}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{lens.tagline}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {lens.stages.map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] font-normal"
                style={{ color: lens.accent_color, background: `color-mix(in oklab, ${lens.accent_color} 10%, transparent)` }}>
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <Card className="panel-raised space-y-4 p-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="model" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Model
            </Label>
          </div>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="model"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="system" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              System prompt {usingDefaultSystem && <span className="ml-1 text-[10px] font-normal opacity-60">(using default)</span>}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={() => setSystemPrompt(DEFAULT_SYSTEM(lens))}
            >
              <RotateCcw className="h-3 w-3" /> Load default
            </Button>
          </div>
          <Textarea
            id="system"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={10}
            placeholder={DEFAULT_SYSTEM(lens)}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="user" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              User prompt template {usingDefaultUser && <span className="ml-1 text-[10px] font-normal opacity-60">(using default)</span>}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={() => setUserTemplate(DEFAULT_USER)}
            >
              <RotateCcw className="h-3 w-3" /> Load default
            </Button>
          </div>
          <Textarea
            id="user"
            value={userTemplate}
            onChange={(e) => setUserTemplate(e.target.value)}
            rows={6}
            placeholder={DEFAULT_USER}
            className="font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            Available placeholders: <code>{"{{subject_name}}"}</code>, <code>{"{{subject_description}}"}</code>, <code>{"{{subject_kind}}"}</code>, <code>{"{{stages}}"}</code>
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1">
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? "Saving…" : "Save prompt"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
