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
import { Target, ArrowLeft } from "lucide-react";
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
