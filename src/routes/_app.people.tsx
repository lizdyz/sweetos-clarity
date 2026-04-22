import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { Chip } from "@/components/chips";
import { Bot, User, Workflow as WorkflowIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/people")({
  component: PeoplePage,
});

const KIND_META = {
  human: { label: "Human", icon: User },
  workflow: { label: "Workflow", icon: WorkflowIcon },
  agent: { label: "Agent", icon: Bot },
} as const;

type WorkloadRow = {
  operator_id: string;
  name: string;
  kind: "human" | "workflow" | "agent";
  availability: string;
  skills: string[];
  open_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  next_due: string | null;
  enabled: boolean;
};

function PeoplePage() {
  const [filter, setFilter] = useState<"all" | "human" | "workflow" | "agent">("all");

  const { data: workload = [] } = useQuery<WorkloadRow[]>({
    queryKey: ["operator-workload-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operator_workload")
        .select("*")
        .order("open_tasks", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkloadRow[];
    },
  });

  const filtered = workload.filter((o) => o.enabled !== false && (filter === "all" || o.kind === filter));

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workload across humans, workflows, and agents.
        </p>
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
            {k === "all"
              ? `All (${workload.length})`
              : `${KIND_META[k].label}s (${workload.filter((o) => o.kind === k).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const meta = KIND_META[p.kind];
          const Icon = meta.icon;
          return (
            <Link
              key={p.operator_id}
              to="/operators/$id"
              params={{ id: p.operator_id }}
              className="block"
            >
              <div className="panel-raised p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {meta.label} · {p.availability}
                      </div>
                    </div>
                  </div>
                  <Chip tone={p.open_tasks > 10 ? "destructive" : p.open_tasks > 5 ? "warning" : "iris"}>
                    {p.open_tasks} open
                  </Chip>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Blocked" value={p.blocked_tasks} tone={p.blocked_tasks ? "destructive" : "muted"} />
                  <Mini label="Overdue" value={p.overdue_tasks} tone={p.overdue_tasks ? "warning" : "muted"} />
                  <Mini label="Open" value={p.open_tasks} tone="neutral" />
                </div>
                {p.next_due && (
                  <div className="mt-3 truncate border-t border-border pt-2 text-[11px] text-muted-foreground">
                    Next due: {new Date(p.next_due).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No operators match this filter.
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "destructive" | "warning" | "muted";
}) {
  const cls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-[color:var(--warning-foreground)]"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
