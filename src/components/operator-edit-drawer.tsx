import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AI_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

export type OperatorEditable = {
  id: string;
  kind: "human" | "workflow" | "agent";
  skills: string[];
  likes: string[];
  dislikes: string[];
  notes: string | null;
  agent_model: string | null;
  agent_system_prompt: string | null;
};

export function OperatorEditDrawer({ operator }: { operator: OperatorEditable }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-1.5 h-3.5 w-3.5" /> Edit profile
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Edit operator</SheetTitle>
        </SheetHeader>
        <EditForm operator={operator} />
      </SheetContent>
    </Sheet>
  );
}

function EditForm({ operator }: { operator: OperatorEditable }) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: async (patch: Partial<OperatorEditable>) => {
      const { error } = await sb.from("operators").update(patch).eq("id", operator.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator", operator.id] });
      qc.invalidateQueries({ queryKey: ["operators"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-4 space-y-5">
      <ChipGroup
        title="Skills"
        subtitle="What they can do"
        values={operator.skills}
        onChange={(skills) => update.mutate({ skills })}
      />
      <ChipGroup
        title="Likes"
        subtitle="Energizes them"
        values={operator.likes}
        onChange={(likes) => update.mutate({ likes })}
        tone="emerald"
      />
      <ChipGroup
        title="Dislikes"
        subtitle="Avoid sending"
        values={operator.dislikes}
        onChange={(dislikes) => update.mutate({ dislikes })}
        tone="rose"
      />

      {operator.kind === "agent" && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">AI model</Label>
            <Select value={operator.agent_model ?? AI_MODELS[0]} onValueChange={(v) => update.mutate({ agent_model: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">System prompt</Label>
            <DebouncedTextarea
              value={operator.agent_system_prompt ?? ""}
              onSave={(agent_system_prompt) => update.mutate({ agent_system_prompt })}
            />
          </div>
        </div>
      )}

      <div className="border-t border-border/40 pt-4">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</Label>
        <DebouncedTextarea
          value={operator.notes ?? ""}
          onSave={(notes) => update.mutate({ notes })}
          rows={3}
        />
      </div>
    </div>
  );
}

function DebouncedTextarea({ value, onSave, rows = 6 }: { value: string; onSave: (v: string) => void; rows?: number }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <Textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      rows={rows}
      className="text-sm"
    />
  );
}

function ChipGroup({
  title, subtitle, values, onChange, tone = "iris",
}: {
  title: string; subtitle: string; values: string[]; onChange: (v: string[]) => void;
  tone?: "iris" | "emerald" | "rose";
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : tone === "rose"
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
        : "bg-iris/10 text-[color:var(--iris-violet)]";

  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) { setDraft(""); setAdding(false); return; }
    onChange([...values, v]);
    setDraft("");
    setAdding(false);
  }

  return (
    <div>
      <div className="mb-1.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", toneCls)}>
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="hover:opacity-70">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {adding ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") { setDraft(""); setAdding(false); }
            }}
            className="h-6 w-28 text-[11px]"
            placeholder="Add…"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-iris/40 hover:text-foreground"
          >
            <Plus className="h-2.5 w-2.5" /> Add
          </button>
        )}
      </div>
    </div>
  );
}
