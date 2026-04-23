import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WalkMenu } from "@/components/walk-menu";
import { HandoffInbox } from "@/components/handoff-inbox";
import { cn } from "@/lib/utils";

const DONE_STATUSES = ["Done", "Complete", "Completed", "Cancelled", "Canceled", "Archived"];

type TaskRow = {
  id: string;
  name: string | null;
  status: string | null;
  due_date: string | null;
  scheduled_for: string | null;
  blocked: boolean | null;
  waiting_on: string | null;
  updated_at: string | null;
};

type StepRunRow = {
  id: string;
  status: string | null;
  run_id: string;
  workflow_steps: { name: string | null; workflow_id: string } | null;
};

type TabKey = "now" | "queue" | "blocked" | "awaiting" | "handoffs" | "history";

export function OperatorQueueTabs({ operatorId }: { operatorId: string }) {
  const [tab, setTab] = useState<TabKey>("now");

  return (
    <Card className="p-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="now" className="text-xs"><CountedLabel label="Now" kind="now" operatorId={operatorId} /></TabsTrigger>
          <TabsTrigger value="queue" className="text-xs"><CountedLabel label="Queue" kind="queue" operatorId={operatorId} /></TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs"><CountedLabel label="Blocked" kind="blocked" operatorId={operatorId} /></TabsTrigger>
          <TabsTrigger value="awaiting" className="text-xs"><CountedLabel label="Awaiting" kind="awaiting" operatorId={operatorId} /></TabsTrigger>
          <TabsTrigger value="handoffs" className="text-xs">Handoffs</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
        </TabsList>

        <TabsContent value="now" className="mt-3"><TaskList operatorId={operatorId} mode="now" /></TabsContent>
        <TabsContent value="queue" className="mt-3"><TaskList operatorId={operatorId} mode="queue" /></TabsContent>
        <TabsContent value="blocked" className="mt-3"><TaskList operatorId={operatorId} mode="blocked" /></TabsContent>
        <TabsContent value="awaiting" className="mt-3"><AwaitingList operatorId={operatorId} /></TabsContent>
        <TabsContent value="handoffs" className="mt-3">
          <HandoffInbox operatorId={operatorId} />
        </TabsContent>
        <TabsContent value="history" className="mt-3"><TaskList operatorId={operatorId} mode="history" /></TabsContent>
      </Tabs>
    </Card>
  );
}

function CountedLabel({ label, kind, operatorId }: { label: string; kind: "now" | "queue" | "blocked" | "awaiting"; operatorId: string }) {
  const { data } = useQuery<number>({
    queryKey: ["operator-queue-count", kind, operatorId],
    queryFn: async () => {
      if (kind === "awaiting") {
        const { count, error } = await sb
          .from("workflow_step_runs")
          .select("id", { count: "exact", head: true })
          .eq("operator_id", operatorId)
          .eq("status", "awaiting_approval");
        if (error) throw error;
        return count ?? 0;
      }
      const today = new Date().toISOString().slice(0, 10);
      let q = sb.from("tasks").select("id", { count: "exact", head: true }).eq("operator_id", operatorId);
      if (kind === "now") {
        q = q.not("status", "in", `(${DONE_STATUSES.join(",")})`).or(`scheduled_for.eq.${today},due_date.eq.${today}`);
      } else if (kind === "blocked") {
        q = q.eq("blocked", true);
      } else if (kind === "queue") {
        q = q.not("status", "in", `(${DONE_STATUSES.join(",")})`).eq("blocked", false);
      }
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });
  return (
    <span>
      {label}
      {typeof data === "number" && data > 0 && (
        <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{data}</span>
      )}
    </span>
  );
}

function TaskList({ operatorId, mode }: { operatorId: string; mode: "now" | "queue" | "blocked" | "history" }) {
  const { data: tasks = [], isLoading } = useQuery<TaskRow[]>({
    queryKey: ["operator-queue", mode, operatorId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      let q = sb
        .from("tasks")
        .select("id, name, status, due_date, scheduled_for, blocked, waiting_on, updated_at")
        .eq("operator_id", operatorId);

      if (mode === "now") {
        q = q.not("status", "in", `(${DONE_STATUSES.join(",")})`).or(`scheduled_for.eq.${today},due_date.eq.${today}`).order("due_date", { ascending: true });
      } else if (mode === "blocked") {
        q = q.eq("blocked", true).order("due_date", { ascending: true, nullsFirst: false });
      } else if (mode === "queue") {
        q = q.not("status", "in", `(${DONE_STATUSES.join(",")})`).eq("blocked", false).order("due_date", { ascending: true, nullsFirst: false });
      } else {
        // history
        q = q.in("status", ["Done", "Complete", "Completed"]).order("updated_at", { ascending: false }).limit(25);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });

  if (isLoading) return <div className="p-3 text-xs text-muted-foreground">Loading…</div>;
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        {emptyCopy(mode)}
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {tasks.map((t) => (
        <li key={t.id} className="group flex items-center gap-2 rounded-lg border border-border/40 bg-background p-2 text-xs hover:bg-muted/30">
          <Link
            to="/tasks/$id"
            params={{ id: t.id }}
            className="min-w-0 flex-1 truncate font-medium"
          >
            {t.name ?? "Untitled"}
          </Link>
          {t.waiting_on && <Badge variant="outline" className="h-5 shrink-0 text-[10px]">waiting</Badge>}
          {t.status && <span className="shrink-0 text-[10px] text-muted-foreground">{t.status}</span>}
          {(mode === "history" ? t.updated_at : t.due_date) && (
            <span className={cn(
              "shrink-0 text-[10px] tabular-nums",
              isOverdue(t.due_date) && mode !== "history" ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground",
            )}>
              {fmtDate(mode === "history" ? t.updated_at : t.due_date)}
            </span>
          )}
          <WalkMenu kind="task" id={t.id} />
        </li>
      ))}
    </ul>
  );
}

function AwaitingList({ operatorId }: { operatorId: string }) {
  const { data: rows = [], isLoading } = useQuery<StepRunRow[]>({
    queryKey: ["operator-awaiting", operatorId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("workflow_step_runs")
        .select("id, status, run_id, workflow_steps(name, workflow_id)")
        .eq("operator_id", operatorId)
        .eq("status", "awaiting_approval")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as StepRunRow[];
    },
  });

  if (isLoading) return <div className="p-3 text-xs text-muted-foreground">Loading…</div>;
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        Nothing awaiting your approval.
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const wfId = r.workflow_steps?.workflow_id;
        const stepName = r.workflow_steps?.name ?? "Workflow step";
        return (
          <li key={r.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-background p-2 text-xs hover:bg-muted/30">
            {wfId ? (
              <Link
                to="/workflows/$id/runs/$runId"
                params={{ id: wfId, runId: r.run_id }}
                className="min-w-0 flex-1 truncate font-medium"
              >
                {stepName}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 truncate font-medium">{stepName}</span>
            )}
            <Badge className="h-5 shrink-0 bg-amber-500/10 text-[10px] text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
              awaiting approval
            </Badge>
            <WalkMenu kind="workflow_run" id={r.run_id} />
          </li>
        );
      })}
    </ul>
  );
}

function emptyCopy(mode: "now" | "queue" | "blocked" | "history"): string {
  if (mode === "now") return "Nothing scheduled or due today.";
  if (mode === "queue") return "Queue is clear.";
  if (mode === "blocked") return "Nothing is blocked. Nice.";
  return "No completed work yet.";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return due < new Date().toISOString().slice(0, 10);
}
