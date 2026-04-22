import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { sb } from "@/lib/sb";
import { toast } from "sonner";

export interface SystemPromptRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: string | null;
  system_prompt: string | null;
  user_prompt_template: string | null;
  model: string | null;
  updated_at: string;
}

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-flash-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

interface Props {
  prompt: SystemPromptRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptEditorSheet({ prompt, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userTemplate, setUserTemplate] = useState("");
  const [model, setModel] = useState(MODELS[0]);

  useEffect(() => {
    if (prompt) {
      setName(prompt.name);
      setDescription(prompt.description ?? "");
      setSystemPrompt(prompt.system_prompt ?? "");
      setUserTemplate(prompt.user_prompt_template ?? "");
      setModel(prompt.model ?? MODELS[0]);
    }
  }, [prompt]);

  const save = useMutation({
    mutationFn: async () => {
      if (!prompt) return;
      const { error } = await sb
        .from("system_prompts")
        .update({
          name,
          description,
          system_prompt: systemPrompt,
          user_prompt_template: userTemplate,
          model,
        })
        .eq("id", prompt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prompt saved");
      qc.invalidateQueries({ queryKey: ["system_prompts"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {prompt?.key}
            </span>
          </SheetTitle>
          <SheetDescription>{prompt?.scope ?? "system"} prompt</SheetDescription>
        </SheetHeader>

        {prompt && (
          <div className="mt-4 space-y-4 overflow-y-auto pb-20">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Name
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Model
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m} value={m} className="font-mono text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                System prompt
              </label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={10}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                User prompt template
              </label>
              <Textarea
                value={userTemplate}
                onChange={(e) => setUserTemplate(e.target.value)}
                rows={6}
                className="mt-1 font-mono text-xs"
                placeholder="Use {{variables}} for substitution at runtime."
              />
            </div>
            <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-6 py-3 backdrop-blur">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
