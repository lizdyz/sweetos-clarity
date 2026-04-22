import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Activity, FolderKanban, ListChecks } from "lucide-react";
import { sb as supabase } from "@/lib/sb";
import { DueDateChip } from "@/components/due-date-chip";
import { ScheduledChip } from "@/components/scheduled-chip";
import { cn } from "@/lib/utils";

interface ActiveBuildPanelProps {
  componentId: string;
  className?: string;
}

const DONE_STATUSES = ["Done", "Complete", "Completed", "Shipped", "Cancelled", "Canceled", "Archived"];

export function ActiveBuildPanel({ componentId, className }: ActiveBuildPanelProps) {
  const { data: projectLinks = [] } = useQuery({
    queryKey: ["component_active_projects", componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_components" as never)
        .select("project_id, contribution_type, target_maturity_level, target_date")
        .eq("component_id", componentId);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        project_id: string;
        contribution_type: string;
        target_maturity_level: string | null;
        target_date: string | null;
      }>;
    },
  });

  const projectIds = projectLinks.map((l) => l.project_id);
  const { data: projects = [] } = useQuery({
    queryKey: ["component_projects_resolve", projectIds.join(",")],
    queryFn: async () => {
      if (projectIds.length === 0) return [] as Array<{ id: string; name: string; status: string | null; deadline: string | null; scheduled_for: string | null }>;
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, deadline, scheduled_for")
        .in("id", projectIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; status: string | null; deadline: string | null; scheduled_for: string | null }>;
    },
    enabled: projectIds.length > 0,
  });

  const { data: taskLinks = [] } = useQuery({
    queryKey: ["component_active_tasks", componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_components" as never)
        .select("task_id")
        .eq("component_id", componentId);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ task_id: string }>;
    },
  });

  const taskIds = taskLinks.map((l) => l.task_id);
  const { data: tasks = [] } = useQuery({
    queryKey: ["component_tasks_resolve", taskIds.join(",")],
    queryFn: async () => {
      if (taskIds.length === 0) return [] as Array<{ id: string; name: string; status: string | null; due_date: string | null; scheduled_for: string | null; updated_at: string }>;
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status, due_date, scheduled_for, updated_at")
        .in("id", taskIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; status: string | null; due_date: string | null; scheduled_for: string | null; updated_at: string }>;
    },
    enabled: taskIds.length > 0,
  });

  const linkByProjectId = new Map(projectLinks.map((l) => [l.project_id, l]));
  const activeProjects = projects.filter((p) => !DONE_STATUSES.includes(p.status ?? ""));
  const activeTasks = tasks.filter((t) => !DONE_STATUSES.includes(t.status ?? ""));

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/50 p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Active build work</h3>
        <span className="text-xs text-muted-foreground">
          {activeProjects.length} project{activeProjects.length === 1 ? "" : "s"} ·{" "}
          {activeTasks.length} task{activeTasks.length === 1 ? "" : "s"}
        </span>
      </div>

      {activeProjects.length === 0 && activeTasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing actively building this component. Link a project from any project's "Building / Refining" panel.
        </p>
      ) : (
        <div className="space-y-3">
          {activeProjects.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                <FolderKanban className="h-3 w-3" /> Projects
              </div>
              <div className="space-y-1.5">
                {activeProjects.map((p) => {
                  const link = linkByProjectId.get(p.id);
                  return (
                    <Link
                      key={p.id}
                      to="/projects/$id"
                      params={{ id: p.id }}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background p-2 hover:border-primary/40"
                    >
                      <span className="text-sm font-medium">{p.name}</span>
                      {link?.contribution_type && (
                        <span className="rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px]">
                          {link.contribution_type}
                        </span>
                      )}
                      {link?.target_maturity_level && (
                        <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-700 dark:text-violet-300">
                          → {link.target_maturity_level}
                        </span>
                      )}
                      <DueDateChip due={p.deadline ?? link?.target_date} />
                      {p.scheduled_for && <ScheduledChip scheduledFor={p.scheduled_for} />}
                      {p.status && (
                        <span className="ml-auto text-[10px] text-muted-foreground">{p.status}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {activeTasks.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                <ListChecks className="h-3 w-3" /> Tasks
              </div>
              <div className="space-y-1.5">
                {activeTasks.map((t) => (
                  <Link
                    key={t.id}
                    to="/tasks/$id"
                    params={{ id: t.id }}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background p-2 hover:border-primary/40"
                  >
                    <span className="text-sm">{t.name}</span>
                    <DueDateChip due={t.due_date} />
                    {t.scheduled_for && <ScheduledChip scheduledFor={t.scheduled_for} />}
                    {t.status && (
                      <span className="ml-auto text-[10px] text-muted-foreground">{t.status}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
