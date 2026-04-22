import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Chip } from "@/components/chips";

export const Route = createFileRoute("/_app/people")({
  component: PeoplePage,
});

const DONE_STATUSES = ["Done", "Complete", "Completed", "Cancelled", "Canceled", "Archived"];

function PeoplePage() {
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role_label, avatar_url");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "for-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status, due_date, blocked, assignee_id, owner")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const rosterById = new Map<string, any>();
  profiles.forEach((p: any) => {
    rosterById.set(p.id, { ...p, key: p.id, label: p.display_name ?? "Unnamed", tasks: [] });
  });
  // legacy owner buckets
  const legacyByName = new Map<string, any>();

  tasks.forEach((t: any) => {
    if (DONE_STATUSES.includes(t.status)) return;
    if (t.assignee_id && rosterById.has(t.assignee_id)) {
      rosterById.get(t.assignee_id).tasks.push(t);
    } else if (t.owner) {
      const key = `owner:${t.owner}`;
      if (!legacyByName.has(key)) {
        legacyByName.set(key, { key, label: t.owner, role_label: "legacy owner", tasks: [] });
      }
      legacyByName.get(key).tasks.push(t);
    } else {
      const key = "unassigned";
      if (!legacyByName.has(key)) {
        legacyByName.set(key, { key, label: "Unassigned", role_label: null, tasks: [] });
      }
      legacyByName.get(key).tasks.push(t);
    }
  });

  const roster = [...rosterById.values(), ...legacyByName.values()].sort(
    (a, b) => b.tasks.length - a.tasks.length,
  );

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workload across the team. Who's drowning, who's free.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roster.map((p) => {
          const open = p.tasks.length;
          const blocked = p.tasks.filter((t: any) => t.blocked).length;
          const overdue = p.tasks.filter(
            (t: any) => t.due_date && t.due_date < today,
          ).length;
          const next = p.tasks
            .filter((t: any) => t.due_date)
            .sort((a: any, b: any) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];
          return (
            <div key={p.key} className="panel-raised p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{p.label}</div>
                  {p.role_label && (
                    <div className="text-[11px] text-muted-foreground">{p.role_label}</div>
                  )}
                </div>
                <Chip tone={open > 10 ? "destructive" : open > 5 ? "warning" : "iris"}>
                  {open} open
                </Chip>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini label="Blocked" value={blocked} tone={blocked ? "destructive" : "muted"} />
                <Mini label="Overdue" value={overdue} tone={overdue ? "warning" : "muted"} />
                <Mini label="Open" value={open} tone="neutral" />
              </div>
              {next && (
                <div className="mt-3 truncate border-t border-border pt-2 text-[11px] text-muted-foreground">
                  Next: {next.name} · {new Date(next.due_date).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
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
