import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, ArrowLeft, Briefcase, Megaphone, ListChecks } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/library/jtbd/$id")({
  component: JTBDDetail,
});

interface JTBDRow {
  id: string;
  statement: string;
  job_type: string;
  context: string | null;
  desired_outcome: string | null;
  current_solution: string | null;
  pain_severity: number | null;
  status: string;
  notes: string | null;
}

function JTBDDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<JTBDRow | null>({
    queryKey: ["jtbd", id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("jobs_to_be_done")
        .select(
          "id, statement, job_type, context, desired_outcome, current_solution, pain_severity, status, notes",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as JTBDRow | null) ?? null;
    },
  });

  const [form, setForm] = useState<JTBDRow | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (payload: Partial<JTBDRow>) => {
      const { error } = await sb.from("jobs_to_be_done").update(payload as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved.");
      qc.invalidateQueries({ queryKey: ["jtbd"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (isLoading || !form) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <Link to="/library/jtbd" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All JTBDs
      </Link>
      <header className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris/10 text-[color:var(--iris-violet)]">
          <Target className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{form.statement}</h1>
          <p className="text-xs text-muted-foreground">
            Status: {form.status} · Type: {form.job_type}
          </p>
        </div>
      </header>

      <Card className="space-y-3 p-4">
        <Field label="Statement">
          <Textarea
            value={form.statement}
            onChange={(e) => setForm({ ...form, statement: e.target.value })}
            className="min-h-[60px]"
          />
        </Field>
        <Field label="Context (when this happens)">
          <Textarea
            value={form.context ?? ""}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
          />
        </Field>
        <Field label="Desired outcome (so I can…)">
          <Textarea
            value={form.desired_outcome ?? ""}
            onChange={(e) => setForm({ ...form, desired_outcome: e.target.value })}
          />
        </Field>
        <Field label="Current solution (what they do today)">
          <Textarea
            value={form.current_solution ?? ""}
            onChange={(e) => setForm({ ...form, current_solution: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Type">
            <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">Functional</SelectItem>
                <SelectItem value="emotional">Emotional</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Pain (1–5)">
            <Input
              type="number"
              min={1}
              max={5}
              value={form.pain_severity ?? ""}
              onChange={(e) =>
                setForm({ ...form, pain_severity: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="discovered">Discovered</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="addressed">Addressed</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
            Save changes
          </Button>
        </div>
      </Card>

      <WorkInFlightPanel jtbdId={id} />
    </div>
  );
}

function WorkInFlightPanel({ jtbdId }: { jtbdId: string }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ["jtbd-work", jtbdId, "tasks"],
    queryFn: async () => {
      const { data } = await sb
        .from("task_jtbds")
        .select("task_id, tasks!inner(id, title, status)")
        .eq("jtbd_id", jtbdId)
        .limit(20);
      return (data ?? []) as Array<{ task_id: string; tasks: { id: string; title: string; status: string | null } }>;
    },
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["jtbd-work", jtbdId, "projects"],
    queryFn: async () => {
      const { data } = await sb
        .from("project_jtbds")
        .select("project_id, projects!inner(id, project_name, status)")
        .eq("jtbd_id", jtbdId)
        .limit(20);
      return (data ?? []) as Array<{ project_id: string; projects: { id: string; project_name: string; status: string | null } }>;
    },
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["jtbd-work", jtbdId, "campaigns"],
    queryFn: async () => {
      const { data } = await sb
        .from("campaign_jtbds")
        .select("campaign_id, campaigns!inner(id, campaign_name, status)")
        .eq("jtbd_id", jtbdId)
        .limit(20);
      return (data ?? []) as Array<{ campaign_id: string; campaigns: { id: string; campaign_name: string; status: string | null } }>;
    },
  });

  const total = tasks.length + projects.length + campaigns.length;

  return (
    <Card className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Work in flight against this JTBD</h2>
        <span className="text-[11px] text-muted-foreground">{total} item{total === 1 ? "" : "s"}</span>
      </header>

      {total === 0 && (
        <p className="text-xs text-muted-foreground">
          No active work yet — captures linked to this JTBD will show up here.
        </p>
      )}

      {tasks.length > 0 && (
        <Group icon={ListChecks} label="Tasks" count={tasks.length}>
          {tasks.slice(0, 5).map((t) => (
            <Link
              key={t.task_id}
              to="/tasks/$id"
              params={{ id: t.task_id }}
              className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted"
            >
              <span className="truncate">{t.tasks.title}</span>
              {t.tasks.status && (
                <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t.tasks.status}
                </span>
              )}
            </Link>
          ))}
        </Group>
      )}

      {projects.length > 0 && (
        <Group icon={Briefcase} label="Projects" count={projects.length}>
          {projects.slice(0, 5).map((p) => (
            <Link
              key={p.project_id}
              to="/projects/$id"
              params={{ id: p.project_id }}
              className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted"
            >
              <span className="truncate">{p.projects.project_name}</span>
              {p.projects.status && (
                <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {p.projects.status}
                </span>
              )}
            </Link>
          ))}
        </Group>
      )}

      {campaigns.length > 0 && (
        <Group icon={Megaphone} label="Campaigns" count={campaigns.length}>
          {campaigns.slice(0, 5).map((c) => (
            <Link
              key={c.campaign_id}
              to="/campaigns/$id"
              params={{ id: c.campaign_id }}
              className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted"
            >
              <span className="truncate">{c.campaigns.campaign_name}</span>
              {c.campaigns.status && (
                <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {c.campaigns.status}
                </span>
              )}
            </Link>
          ))}
        </Group>
      )}
    </Card>
  );
}

function Group({
  icon: Icon,
  label,
  count,
  children,
}: {
  icon: typeof Briefcase;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label} <span className="text-muted-foreground">({count})</span>
      </div>
      <div className="space-y-0.5 rounded-md border border-border/60 bg-surface/40 p-1">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
