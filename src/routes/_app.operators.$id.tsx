import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Bot, User, Workflow as WorkflowIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DetailShell } from "@/components/detail-shell";
import { OperatorCapacityStrip } from "@/components/operator-capacity-strip";
import { OperatorQueueTabs } from "@/components/operator-queue-tabs";
import { OperatorEditDrawer } from "@/components/operator-edit-drawer";
import { MeasuresPanel } from "@/components/measures-panel";
import { StoryTrail } from "@/components/story-trail";

export const Route = createFileRoute("/_app/operators/$id")({
  component: OperatorDetailPage,
});

const KIND_META = {
  human: { label: "Human", icon: User, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  workflow: { label: "Workflow", icon: WorkflowIcon, tone: "bg-iris/10 text-[color:var(--iris-violet)]" },
  agent: { label: "Agent", icon: Bot, tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
} as const;

const AVAIL_OPTS = ["available", "busy", "offline", "async-only"];

type Operator = {
  id: string;
  name: string;
  kind: "human" | "workflow" | "agent";
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
    <DetailShell
      backTo="/operators"
      backLabel="All operators"
      header={
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("grid h-12 w-12 place-items-center rounded-xl", meta.tone)}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <EditableName name={op.name} onSave={(name) => update.mutate({ name })} />
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="secondary" className="h-5 text-[10px] capitalize">{meta.label}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="w-44">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Availability</Label>
              <Select value={op.availability} onValueChange={(v) => update.mutate({ availability: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AVAIL_OPTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <OperatorEditDrawer operator={op} />
          </div>
        </div>
      }
      workContext={<OperatorCapacityStrip operatorId={id} />}
    >
      <OperatorQueueTabs operatorId={id} />

      <MeasuresPanel subjectType="operator" subjectId={id} />

      {op.kind === "agent" && (
        <Collapsible>
          <Card className="p-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-semibold">
              <span>Agent canon</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Model: </span>
                <span className="font-mono">{op.agent_model ?? "—"}</span>
              </div>
              <div>
                <div className="mb-1 text-muted-foreground">System prompt</div>
                <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 font-mono text-[11px]">
                  {op.agent_system_prompt ?? "—"}
                </pre>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {op.kind === "workflow" && op.workflow_id && (
        <Card className="p-3">
          <h2 className="mb-1 text-sm font-semibold">Underlying workflow</h2>
          <Link to="/workflows/$id" params={{ id: op.workflow_id }} className="text-xs text-[color:var(--iris-violet)] hover:underline">
            Open workflow definition →
          </Link>
        </Card>
      )}

      <StoryTrail subjectKind="operator" subjectId={id} />
    </DetailShell>
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
