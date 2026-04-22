import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Component as ComponentIcon, Link2, ShieldAlert, Target } from "lucide-react";
import { sb as supabase } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { DueDateChip } from "@/components/due-date-chip";
import { ScheduledChip } from "@/components/scheduled-chip";

type EntityType = "task" | "project";

interface WorkContextStripProps {
  entityType: EntityType;
  entityId: string;
  className?: string;
  defaultOpen?: boolean;
}

interface ContextRow {
  entity_type: string;
  entity_id: string;
  name: string;
  building_components: string[];
  for_relationship: string | null;
  tagged_domains: string[];
  tagged_tenets: string[];
  due_date: string | null;
  scheduled_for: string | null;
  not_before: string | null;
  done_at: string | null;
  recurrence_rule: string | null;
  blocked_by_tasks: string[];
  blocking_tasks: string[];
  parent_project_id: string | null;
  parent_campaign_id: string | null;
}

export function WorkContextStrip({
  entityType,
  entityId,
  className,
  defaultOpen = true,
}: WorkContextStripProps) {
  const [open, setOpen] = useState(defaultOpen);

  const { data, isLoading } = useQuery({
    queryKey: ["work_context", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_context" as never)
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ContextRow | null;
    },
    enabled: !!entityId,
  });

  const componentIds = data?.building_components ?? [];
  const { data: components } = useQuery({
    queryKey: ["context_components", componentIds.join(",")],
    queryFn: async () => {
      if (componentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("components")
        .select("id, name, current_maturity_level")
        .in("id", componentIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: componentIds.length > 0,
  });

  const { data: relationship } = useQuery({
    queryKey: ["context_relationship", data?.for_relationship],
    queryFn: async () => {
      if (!data?.for_relationship) return null;
      const { data: r, error } = await supabase
        .from("relationships")
        .select("id, name, company")
        .eq("id", data.for_relationship)
        .maybeSingle();
      if (error) throw error;
      return r;
    },
    enabled: !!data?.for_relationship,
  });

  const { data: parentProject } = useQuery({
    queryKey: ["context_parent_project", data?.parent_project_id],
    queryFn: async () => {
      if (!data?.parent_project_id) return null;
      const { data: p, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", data.parent_project_id)
        .maybeSingle();
      if (error) throw error;
      return p;
    },
    enabled: !!data?.parent_project_id,
  });

  const blockerIds = data?.blocked_by_tasks ?? [];
  type BlockerRow = { id: string; name: string; status: string | null };
  const { data: blockers } = useQuery({
    queryKey: ["context_blockers", blockerIds.join(",")],
    queryFn: async () => {
      if (blockerIds.length === 0) return [] as BlockerRow[];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status")
        .in("id", blockerIds);
      if (error) throw error;
      return ((data ?? []) as BlockerRow[]).filter((t) => !["Done", "Complete", "Completed"].includes(t.status ?? ""));
    },
    enabled: blockerIds.length > 0,
  });

  if (isLoading || !data) return null;

  const hasAnything =
    componentIds.length > 0 ||
    !!data.for_relationship ||
    !!data.parent_project_id ||
    (data.tagged_domains?.length ?? 0) > 0 ||
    (data.tagged_tenets?.length ?? 0) > 0 ||
    (blockers?.length ?? 0) > 0 ||
    !!data.scheduled_for ||
    !!data.due_date ||
    !!data.not_before;

  if (!hasAnything) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-gradient-to-br from-card/60 to-card/30",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="uppercase tracking-wider">Context · what's this for</span>
        </div>
        <div className="flex items-center gap-1.5">
          <DueDateChip due={data.due_date} doneAt={data.done_at} />
          {data.scheduled_for && <ScheduledChip scheduledFor={data.scheduled_for} />}
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border/40 px-3 py-3 text-sm">
          {parentProject && (
            <Row icon={<Link2 className="h-3.5 w-3.5" />} label="Part of project">
              <Link
                to="/projects/$id"
                params={{ id: parentProject.id }}
                className="text-primary hover:underline"
              >
                {parentProject.name}
              </Link>
            </Row>
          )}
          {(components?.length ?? 0) > 0 && (
            <Row icon={<ComponentIcon className="h-3.5 w-3.5" />} label="Advances component">
              <div className="flex flex-wrap gap-1.5">
                {components!.map((c) => (
                  <Link
                    key={c.id}
                    to="/components/$id"
                    params={{ id: c.id }}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-xs hover:border-primary/40"
                  >
                    {c.name}
                    {c.current_maturity_level && (
                      <span className="text-[10px] text-muted-foreground">{c.current_maturity_level}</span>
                    )}
                  </Link>
                ))}
              </div>
            </Row>
          )}
          {relationship && (
            <Row icon={<Target className="h-3.5 w-3.5" />} label="For">
              <Link
                to="/relationships/$id"
                params={{ id: relationship.id }}
                className="text-primary hover:underline"
              >
                {relationship.name}
                {relationship.company && (
                  <span className="text-muted-foreground"> · {relationship.company}</span>
                )}
              </Link>
            </Row>
          )}
          {(data.tagged_domains?.length ?? 0) + (data.tagged_tenets?.length ?? 0) > 0 && (
            <Row icon={<Target className="h-3.5 w-3.5" />} label="Tags">
              <div className="flex flex-wrap gap-1">
                {data.tagged_domains?.map((d) => (
                  <span
                    key={`d-${d}`}
                    className="inline-flex items-center rounded-full border border-border bg-iris-soft px-2 py-0.5 text-[11px]"
                  >
                    {d}
                  </span>
                ))}
                {data.tagged_tenets?.map((t) => (
                  <span
                    key={`t-${t}`}
                    className="inline-flex items-center rounded-full border border-[color:var(--success)]/30 bg-[color:var(--success)]/15 px-2 py-0.5 text-[11px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Row>
          )}
          {(blockers?.length ?? 0) > 0 && (
            <Row icon={<ShieldAlert className="h-3.5 w-3.5 text-rose-500" />} label="Blocked by">
              <div className="flex flex-wrap gap-1.5">
                {blockers!.map((b) => (
                  <Link
                    key={b.id}
                    to="/tasks/$id"
                    params={{ id: b.id }}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-700 hover:border-rose-500/60 dark:text-rose-300"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </Row>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-32 shrink-0 items-center gap-1.5 pt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
