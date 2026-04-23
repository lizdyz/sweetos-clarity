import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, User, Workflow as WorkflowIcon, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/operators/")({
  component: OperatorsListPage,
});

const KIND_META = {
  human: { label: "Human", icon: User, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  workflow: { label: "Workflow", icon: WorkflowIcon, tone: "bg-iris/10 text-[color:var(--iris-violet)]" },
  agent: { label: "Agent", icon: Bot, tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
} as const;

const AVAIL_DOT: Record<string, string> = {
  available: "bg-emerald-500",
  busy: "bg-amber-500",
  offline: "bg-muted-foreground/40",
  "async-only": "bg-iris",
};

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
  skills: string[];
  availability: string;
  avatar_url: string | null;
  enabled: boolean;
};

type Workload = {
  operator_id: string;
  open_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  next_due: string | null;
};

function OperatorsListPage() {
  const [filter, setFilter] = useState<"all" | "human" | "workflow" | "agent">("all");
  const [open, setOpen] = useState(false);

  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operators")
        .select("id, name, kind, skills, availability, avatar_url, enabled")
        .eq("enabled", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Operator[];
    },
  });

  const { data: workload = [] } = useQuery<Workload[]>({
    queryKey: ["operator-workload"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operator_workload")
        .select("operator_id, open_tasks, blocked_tasks, overdue_tasks, next_due");
      if (error) throw error;
      return (data ?? []) as Workload[];
    },
  });

  const wlMap = new Map(workload.map((w) => [w.operator_id, w]));
  const filtered = operators
    .filter((o) => filter === "all" || o.kind === filter)
    .sort((a, b) => (wlMap.get(b.id)?.open_tasks ?? 0) - (wlMap.get(a.id)?.open_tasks ?? 0));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-iris/10 text-[color:var(--iris-violet)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Operators</h1>
            <p className="text-sm text-muted-foreground">
              Anyone — or anything — that does work. Humans, workflows, and AI agents.
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> New operator
        </Button>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "human", "workflow", "agent"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === k
                ? "bg-iris text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {k === "all" ? `All (${operators.length})` : `${KIND_META[k].label}s (${operators.filter((o) => o.kind === k).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((o) => {
          const meta = KIND_META[o.kind];
          const Icon = meta.icon;
          const wl = wlMap.get(o.id);
          return (
            <Link
              key={o.id}
              to="/operators/$id"
              params={{ id: o.id }}
              className="block"
            >
              <Card className="p-4 transition-all hover:border-iris/40 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", meta.tone)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{o.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={cn("h-1.5 w-1.5 rounded-full", AVAIL_DOT[o.availability] ?? "bg-muted")} />
                        {o.availability}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="h-5 text-[10px] capitalize">{meta.label}</Badge>
                </div>

                {o.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {o.skills.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {s}
                      </span>
                    ))}
                    {o.skills.length > 3 && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground">
                        +{o.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-4 gap-1 border-t border-border/50 pt-2 text-center">
                  <Stat n={wl?.open_tasks ?? 0} label="open" />
                  <Stat n={wl?.blocked_tasks ?? 0} label="blocked" tone={wl && wl.blocked_tasks > 0 ? "danger" : "muted"} />
                  <Stat n={wl?.overdue_tasks ?? 0} label="overdue" tone={wl && wl.overdue_tasks > 0 ? "warn" : "muted"} />
                  <Stat n={wl?.next_due ? fmtNextDue(wl.next_due) : "—"} label="next" />
                </div>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
            No operators yet. Click "New operator" to add one.
          </Card>
        )}
      </div>

      <NewOperatorDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Stat({ n, label, tone = "muted" }: { n: number | string; label: string; tone?: "muted" | "warn" | "danger" }) {
  return (
    <div>
      <div className={cn(
        "text-sm font-semibold tabular-nums",
        tone === "danger" && "text-rose-700 dark:text-rose-400",
        tone === "warn" && "text-amber-700 dark:text-amber-400",
        tone === "muted" && "text-foreground/80",
      )}>{n}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function fmtNextDue(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function NewOperatorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"human" | "workflow" | "agent">("agent");
  const [profileId, setProfileId] = useState<string>("");
  const [workflowId, setWorkflowId] = useState<string>("");
  const [agentModel, setAgentModel] = useState<string>(AI_MODELS[0]);
  const [agentPrompt, setAgentPrompt] = useState<string>("");

  const { data: profiles = [] } = useQuery<{ id: string; display_name: string | null }[]>({
    queryKey: ["profiles-for-operator"],
    queryFn: async () => {
      const { data, error } = await sb.from("profiles").select("id, display_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && kind === "human",
  });

  const { data: workflows = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["workflows-for-operator"],
    queryFn: async () => {
      const { data, error } = await sb.from("workflows").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && kind === "workflow",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await sb.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const payload: Record<string, unknown> = {
        name: name.trim(),
        kind,
        created_by: uid,
      };
      if (kind === "human" && profileId) payload.profile_id = profileId;
      if (kind === "workflow" && workflowId) payload.workflow_id = workflowId;
      if (kind === "agent") {
        payload.agent_model = agentModel;
        payload.agent_system_prompt = agentPrompt;
      }
      const { data, error } = await sb.from("operators").insert(payload).select("id").single();
      if (error) throw error;
      return data?.id as string | undefined;
    },
    onSuccess: (newId) => {
      toast.success("Operator created — assign work below");
      qc.invalidateQueries({ queryKey: ["operators"] });
      qc.invalidateQueries({ queryKey: ["operator-workload"] });
      onOpenChange(false);
      setName("");
      setProfileId("");
      setWorkflowId("");
      setAgentPrompt("");
      if (newId) navigate({ to: "/operators/$id", params: { id: newId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New operator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(["human", "workflow", "agent"] as const).map((k) => {
              const meta = KIND_META[k];
              const Icon = meta.icon;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all",
                    kind === k
                      ? "border-iris bg-iris/5"
                      : "border-border hover:border-iris/40",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <Label htmlFor="op-name">Name</Label>
            <Input
              id="op-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "agent" ? "e.g. Drafter Agent" : kind === "workflow" ? "e.g. Pre-Mirror Workflow" : "Display name"}
            />
          </div>

          {kind === "human" && (
            <div>
              <Label>Linked teammate</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger><SelectValue placeholder="Pick a profile…" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name ?? "Unnamed"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === "workflow" && (
            <div>
              <Label>Underlying workflow</Label>
              <Select value={workflowId} onValueChange={setWorkflowId}>
                <SelectTrigger><SelectValue placeholder="Pick a workflow…" /></SelectTrigger>
                <SelectContent>
                  {workflows.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === "agent" && (
            <>
              <div>
                <Label>AI model</Label>
                <Select value={agentModel} onValueChange={setAgentModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="agent-prompt">System prompt</Label>
                <Textarea
                  id="agent-prompt"
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="You are a..."
                  rows={5}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
          >
            Create operator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
