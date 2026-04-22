import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings/canon")({
  component: CanonEditor,
});

interface CanonRow {
  id: string;
  entity_kind: string;
  display_name: string;
  one_liner: string | null;
  what_it_is: string | null;
  what_good_looks_like: string[];
  what_bad_looks_like: string[];
  inputs: string[];
  outputs: string[];
  reinforcement_loop: string | null;
  status: string;
  updated_at: string;
}

function CanonEditor() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>("quest");
  const [editing, setEditing] = useState(false);

  const { data: canons = [], isLoading } = useQuery({
    queryKey: ["entity_canon", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("entity_canon")
        .select("*")
        .order("display_name");
      return (data ?? []) as CanonRow[];
    },
  });

  const current = useMemo(() => canons.find((c) => c.entity_kind === selected) ?? null, [canons, selected]);

  return (
    <div className="px-6 py-5">
      <div className="mb-5 flex items-start gap-3">
        <ShieldCheck className="mt-1 h-6 w-6 text-[color:var(--iris-violet)]" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Entity Canon</h1>
          <p className="text-sm text-muted-foreground">
            What perfection looks like for every entity in the system. Refine it as you learn — drift surfaces, never hides.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[16rem_1fr]">
          {/* Left rail — entity kinds */}
          <aside className="rounded-2xl border border-border bg-surface/60 p-2">
            <ul className="space-y-0.5">
              {canons.map((c) => (
                <li key={c.entity_kind}>
                  <button
                    type="button"
                    onClick={() => { setSelected(c.entity_kind); setEditing(false); }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-medium transition-colors",
                      selected === c.entity_kind
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-foreground/80 hover:bg-sidebar-accent/60",
                    )}
                  >
                    <span className="truncate">{c.display_name}</span>
                    <StatusPip status={c.status} />
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Right pane — selected canon */}
          <main>
            {current ? (
              editing && isAdmin ? (
                <CanonForm
                  canon={current}
                  userId={user?.id ?? null}
                  onCancel={() => setEditing(false)}
                  onSaved={() => {
                    setEditing(false);
                    qc.invalidateQueries({ queryKey: ["entity_canon"] });
                  }}
                />
              ) : (
                <CanonView canon={current} canEdit={isAdmin} onEdit={() => setEditing(true)} />
              )
            ) : null}
          </main>
        </div>
      )}
    </div>
  );
}

function StatusPip({ status }: { status: string }) {
  const tone =
    status === "defined" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
    status === "needs_review" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" :
    "bg-muted text-muted-foreground";
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", tone)}>{status}</span>;
}

function CanonView({ canon, canEdit, onEdit }: { canon: CanonRow; canEdit: boolean; onEdit: () => void }) {
  return (
    <article className="space-y-4">
      <header className="rounded-2xl border border-border bg-surface/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Canon · {canon.entity_kind}</div>
            <h2 className="mt-1 text-xl font-semibold">{canon.display_name}</h2>
            {canon.one_liner && <p className="mt-1 text-sm text-muted-foreground">{canon.one_liner}</p>}
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>
      </header>

      {canon.what_it_is && (
        <Section title="What it is">
          <p className="text-sm leading-relaxed">{canon.what_it_is}</p>
        </Section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="What good looks like" icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}>
          <ul className="space-y-1.5 text-sm">
            {canon.what_good_looks_like.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm border border-border" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Anti-patterns" icon={<AlertCircle className="h-3.5 w-3.5 text-amber-600" />}>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {canon.what_bad_looks_like.map((item, i) => (
              <li key={i} className="flex gap-2"><span>•</span><span>{item}</span></li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Inputs">
          <div className="flex flex-wrap gap-1.5">
            {canon.inputs.map((i) => (
              <span key={i} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px]">{i}</span>
            ))}
          </div>
        </Section>
        <Section title="Outputs">
          <div className="flex flex-wrap gap-1.5">
            {canon.outputs.map((o) => (
              <span key={o} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px]">{o}</span>
            ))}
          </div>
        </Section>
      </div>

      {canon.reinforcement_loop && (
        <Section title="Reinforcement loop">
          <p className="text-sm leading-relaxed text-muted-foreground">{canon.reinforcement_loop}</p>
        </Section>
      )}
    </article>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function CanonForm({ canon, userId, onCancel, onSaved }: { canon: CanonRow; userId: string | null; onCancel: () => void; onSaved: () => void }) {
  const [oneLiner, setOneLiner] = useState(canon.one_liner ?? "");
  const [whatItIs, setWhatItIs] = useState(canon.what_it_is ?? "");
  const [good, setGood] = useState(canon.what_good_looks_like.join("\n"));
  const [bad, setBad] = useState(canon.what_bad_looks_like.join("\n"));
  const [inputs, setInputs] = useState(canon.inputs.join("\n"));
  const [outputs, setOutputs] = useState(canon.outputs.join("\n"));
  const [loop, setLoop] = useState(canon.reinforcement_loop ?? "");
  const [status, setStatus] = useState(canon.status);
  const [busy, setBusy] = useState(false);

  const toLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("entity_canon")
      .update({
        one_liner: oneLiner || null,
        what_it_is: whatItIs || null,
        what_good_looks_like: toLines(good),
        what_bad_looks_like: toLines(bad),
        inputs: toLines(inputs),
        outputs: toLines(outputs),
        reinforcement_loop: loop || null,
        status,
        updated_by: userId,
      })
      .eq("id", canon.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Canon updated");
    onSaved();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Edit · {canon.display_name}</h2>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="draft">Draft</option>
          <option value="defined">Defined</option>
          <option value="needs_review">Needs review</option>
        </select>
      </div>

      <Field label="One-liner"><Input value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} /></Field>
      <Field label="What it is"><Textarea rows={4} value={whatItIs} onChange={(e) => setWhatItIs(e.target.value)} /></Field>
      <Field label="What good looks like (one per line)"><Textarea rows={5} value={good} onChange={(e) => setGood(e.target.value)} /></Field>
      <Field label="Anti-patterns (one per line)"><Textarea rows={4} value={bad} onChange={(e) => setBad(e.target.value)} /></Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Inputs (one per line)"><Textarea rows={4} value={inputs} onChange={(e) => setInputs(e.target.value)} /></Field>
        <Field label="Outputs (one per line)"><Textarea rows={4} value={outputs} onChange={(e) => setOutputs(e.target.value)} /></Field>
      </div>
      <Field label="Reinforcement loop"><Textarea rows={3} value={loop} onChange={(e) => setLoop(e.target.value)} /></Field>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={busy} className="bg-iris text-white">{busy ? "Saving…" : "Save canon"}</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
