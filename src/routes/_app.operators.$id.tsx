import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, User, Workflow as WorkflowIcon, X, Plus, ArrowLeft, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/operators/$id")({
  component: OperatorDetailPage,
});

const KIND_META = {
  human: { label: "Human", icon: User, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  workflow: { label: "Workflow", icon: WorkflowIcon, tone: "bg-iris/10 text-[color:var(--iris-violet)]" },
  agent: { label: "Agent", icon: Bot, tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
} as const;

const AVAIL_OPTS = ["available", "busy", "offline", "async-only"];

const AI_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

type Operator = {
  id: string;
  name: string;
  kind: "human" | "workflow" | "agent";
  profile_id: string | null;
  workflow_id: string | null;
  agent_model: string | null;
  agent_system_prompt: string | null;
  skills: string[];
  likes: string[];
  dislikes: string[];
  availability: string;
  notes: string | null;
  enabled: boolean;
};

function OperatorDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: op, isLoading } = useQuery<Operator>({
    queryKey: ["operator", id],
    queryFn: async () => {
      const { data, error } = await sb.from("operators").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Operator;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["operator-tasks", id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("tasks")
        .select("id, name, status, due_date, blocked")
        .eq("operator_id", id)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Operator>) => {
      const { error } = await sb.from("operators").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator", id] });
      qc.invalidateQueries({ queryKey: ["operators"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !op) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const meta = KIND_META[op.kind];
  const Icon = meta.icon;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-6">
      <Link to="/operators" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All operators
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("grid h-12 w-12 place-items-center rounded-xl", meta.tone)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <EditableName name={op.name} onSave={(name) => update.mutate({ name })} />
            <div className="mt-0.5 flex items-center gap-2">
              <Badge variant="secondary" className="h-5 text-[10px] capitalize">{meta.label}</Badge>
              <span className="text-[11px] text-muted-foreground">
                {tasks.filter((t) => !["Done", "Complete", "Completed"].includes(t.status ?? "")).length} open tasks
              </span>
            </div>
          </div>
        </div>
        <div className="w-44">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Availability</Label>
          <Select value={op.availability} onValueChange={(v) => update.mutate({ availability: v })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AVAIL_OPTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <ChipGroupCard
          title="Skills"
          subtitle="What they can do"
          values={op.skills}
          onChange={(skills) => update.mutate({ skills })}
        />
        <ChipGroupCard
          title="Likes"
          subtitle="Energizes them"
          values={op.likes}
          onChange={(likes) => update.mutate({ likes })}
          tone="emerald"
        />
        <ChipGroupCard
          title="Dislikes"
          subtitle="Avoid sending"
          values={op.dislikes}
          onChange={(dislikes) => update.mutate({ dislikes })}
          tone="rose"
        />
      </div>

      {op.kind === "agent" && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Agent configuration</h2>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Model</Label>
              <Select value={op.agent_model ?? AI_MODELS[0]} onValueChange={(v) => update.mutate({ agent_model: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="prompt" className="text-[10px] uppercase tracking-wider text-muted-foreground">System prompt</Label>
              <EditableTextarea
                value={op.agent_system_prompt ?? ""}
                onSave={(agent_system_prompt) => update.mutate({ agent_system_prompt })}
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.info("Test runs land in the next pass.")}>
              <Play className="mr-1.5 h-3.5 w-3.5" /> Test prompt
            </Button>
          </div>
        </Card>
      )}

      {op.kind === "workflow" && op.workflow_id && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Underlying workflow</h2>
          <Link to="/workflows/$id" params={{ id: op.workflow_id }} className="text-sm text-[color:var(--iris-violet)] hover:underline">
            Open workflow definition →
          </Link>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Open tasks</h2>
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            No tasks assigned yet.
          </div>
        ) : (
          <ul className="space-y-1">
            {tasks.slice(0, 20).map((t) => (
              <li key={t.id}>
                <Link
                  to="/tasks/$id"
                  params={{ id: t.id }}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-2 text-xs hover:bg-muted/40"
                >
                  <span className="truncate font-medium">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground">{t.status ?? "—"} · {t.due_date ?? ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EditableName({ name, onSave }: { name: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(name);
  useEffect(() => setV(name), [name]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== name && v.trim() && onSave(v.trim())}
      className="bg-transparent text-2xl font-semibold tracking-tight outline-none focus:border-b focus:border-iris/40"
    />
  );
}

function EditableTextarea({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <Textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      rows={6}
      className="text-sm"
    />
  );
}

function ChipGroupCard({
  title,
  subtitle,
  values,
  onChange,
  tone = "iris",
}: {
  title: string;
  subtitle: string;
  values: string[];
  onChange: (v: string[]) => void;
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
    if (!v || values.includes(v)) {
      setDraft("");
      setAdding(false);
      return;
    }
    onChange([...values, v]);
    setDraft("");
    setAdding(false);
  }

  return (
    <Card className="p-4">
      <div className="mb-2">
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
    </Card>
  );
}
