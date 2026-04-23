// Step 5 — Tasks. Break the active Project into operator-assignable tasks.
// Reads from `tasks` filtered by project_id. Inline add with optional Operator.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ListChecks, ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EntityKindHelper } from "@/components/entity-kind-helper";
import { InlineAddRow } from "./inline-add-row";
import { cn } from "@/lib/utils";

interface ProjectRow {
  id: string;
  name: string;
}
interface TaskRow {
  id: string;
  name: string;
  status: string | null;
  operator_id: string | null;
}
interface OperatorMin {
  id: string;
  display_name: string | null;
}

interface Props {
  questId: string | null;
  onBack: () => void;
  onNext: () => void;
}

export function StepTasks({ questId, onBack, onNext }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [defaultOperator, setDefaultOperator] = useState<string | null>(null);

  // Projects under this quest
  const { data: projects = [] } = useQuery<ProjectRow[]>({
    queryKey: ["planning", "projects-for-quest-tasks", questId],
    enabled: !!questId,
    queryFn: async () => {
      if (!questId) return [];
      const { data } = await sb
        .from("projects")
        .select("id, name, execution_prompt")
        .like("execution_prompt", `[quest:${questId}]%`)
        .order("updated_at", { ascending: false });
      const rows = (data ?? []) as ProjectRow[];
      if (rows.length > 0 && !activeProjectId) {
        setActiveProjectId(rows[0].id);
      }
      return rows;
    },
  });

  const { data: tasks = [] } = useQuery<TaskRow[]>({
    queryKey: ["planning", "tasks-for-project", activeProjectId],
    enabled: !!activeProjectId,
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await sb
        .from("tasks")
        .select("id, name, status, operator_id")
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });

  const { data: operators = [] } = useQuery<OperatorMin[]>({
    queryKey: ["planning", "operators-min"],
    queryFn: async () => {
      const { data } = await sb
        .from("operators")
        .select("id, display_name")
        .order("display_name");
      return (data ?? []) as OperatorMin[];
    },
  });

  const addTask = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await sb.from("tasks").insert({
        name,
        status: "Not Started",
        project_id: activeProjectId,
        operator_id: defaultOperator,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning", "tasks-for-project", activeProjectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-[color:var(--iris-violet)]" />
          <h2 className="text-base font-semibold">Step 5 · Tasks</h2>
          <EntityKindHelper kind="task" />
        </div>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Break the active Project into atomic, operator-assignable tasks.
          Each task should fit on a sticky note.
        </p>
      </header>

      <EntityKindHelper kind="task" variant="banner" />

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          No Projects under this Quest yet — go back to Step 4 and add one.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/60 p-2">
            <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Project
            </span>
            <Select value={activeProjectId ?? ""} onValueChange={(v) => setActiveProjectId(v)}>
              <SelectTrigger className="h-8 max-w-xs text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Default operator
            </span>
            <Select
              value={defaultOperator ?? "__none__"}
              onValueChange={(v) => setDefaultOperator(v === "__none__" ? null : v)}
            >
              <SelectTrigger className="h-8 max-w-xs text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {operators.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.display_name ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <section className="rounded-2xl border border-border bg-surface/60 p-3">
            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                No tasks yet for this project. Add a few below.
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-background">
                {tasks.map((t) => {
                  const op = operators.find((o) => o.id === t.operator_id);
                  return (
                    <li key={t.id}>
                      <Link
                        to="/tasks/$id"
                        params={{ id: t.id }}
                        className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40"
                      >
                        <span className="truncate text-sm">{t.name}</span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[10px]">
                          {t.status && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 uppercase tracking-[0.1em] text-muted-foreground">
                              {t.status}
                            </span>
                          )}
                          {op && (
                            <span className="rounded-full bg-iris-soft/60 px-1.5 py-0.5 text-[color:var(--iris-violet)]">
                              {op.display_name ?? "—"}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-3">
              <InlineAddRow
                placeholder="e.g. Mount <SweetLensButton> on /quests/$id"
                onAdd={(v) => addTask.mutateAsync(v).then(() => undefined)}
                busy={addTask.isPending}
                disabled={!activeProjectId}
                disabledHint="Pick a project above first."
              />
            </div>
          </section>
        </>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40",
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-xl bg-iris px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-glow)]"
        >
          Next: Operators <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
