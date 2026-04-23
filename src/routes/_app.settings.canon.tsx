import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, Pencil, Plus, Network, ArrowUp, ArrowDown, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityCanonGraph } from "@/components/entity-canon-graph";

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
  parent_kinds: string[] | null;
  child_kinds: string[] | null;
  peer_kinds: string[] | null;
  composition_notes: string | null;
  status: string;
  updated_at: string;
}

function CanonEditor() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>("quest");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"detail" | "graph">("detail");

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
  const kindNameMap = useMemo(() => new Map(canons.map((c) => [c.entity_kind, c.display_name])), [canons]);

  function jumpTo(kind: string) {
    if (!kindNameMap.has(kind)) return;
    setSelected(kind);
    setTab("detail");
    setEditing(false);
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-5 flex items-start gap-3">
        <ShieldCheck className="mt-1 h-6 w-6 text-[color:var(--iris-violet)]" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Entity Canon</h1>
          <p className="text-sm text-muted-foreground">
            What perfection looks like for every entity in the system. Refine it as you learn — drift surfaces, never hides.
          </p>
        </div>
        {isAdmin && <NewEntityKindSheet userId={user?.id ?? null} onCreated={(kind) => { qc.invalidateQueries({ queryKey: ["entity_canon"] }); setSelected(kind); setTab("detail"); }} />}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "detail" | "graph")} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="detail">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Definition
            </TabsTrigger>
            <TabsTrigger value="graph">
              <Network className="mr-1.5 h-3.5 w-3.5" /> Knowledge graph
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detail" className="mt-0">
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
                    <CanonView canon={current} canEdit={isAdmin} onEdit={() => setEditing(true)} kindNameMap={kindNameMap} onJump={jumpTo} />
                  )
                ) : null}
              </main>
            </div>
          </TabsContent>

          <TabsContent value="graph" className="mt-0">
            <EntityCanonGraph nodes={canons} onSelect={jumpTo} />
          </TabsContent>
        </Tabs>
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

function GraphChips({
  parents, children, peers, kindNameMap, onJump, notes,
}: {
  parents: string[]; children: string[]; peers: string[];
  kindNameMap: Map<string, string>;
  onJump: (k: string) => void;
  notes: string | null;
}) {
  const has = parents.length || children.length || peers.length || notes;
  if (!has) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Knowledge graph</div>
      <div className="space-y-1.5">
        {parents.length > 0 && (
          <Row icon={<ArrowUp className="h-3 w-3" />} label="Parent kinds">
            {parents.map((k) => (
              <ChipButton key={k} onClick={() => onJump(k)}>{kindNameMap.get(k) ?? k}</ChipButton>
            ))}
          </Row>
        )}
        {children.length > 0 && (
          <Row icon={<ArrowDown className="h-3 w-3" />} label="Child kinds">
            {children.map((k) => (
              <ChipButton key={k} onClick={() => onJump(k)}>{kindNameMap.get(k) ?? k}</ChipButton>
            ))}
          </Row>
        )}
        {peers.length > 0 && (
          <Row icon={<ArrowLeftRight className="h-3 w-3" />} label="Peers">
            {peers.map((k) => (
              <ChipButton key={k} onClick={() => onJump(k)}>{kindNameMap.get(k) ?? k}</ChipButton>
            ))}
          </Row>
        )}
        {notes && <p className="pt-1 text-xs italic text-muted-foreground">{notes}</p>}
      </div>
    </section>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {icon}{label}
      </span>
      {children}
    </div>
  );
}

function ChipButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-iris-soft/40"
    >
      {children}
    </button>
  );
}

function CanonView({
  canon, canEdit, onEdit, kindNameMap, onJump,
}: {
  canon: CanonRow; canEdit: boolean; onEdit: () => void;
  kindNameMap: Map<string, string>; onJump: (k: string) => void;
}) {
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

      <GraphChips
        parents={canon.parent_kinds ?? []}
        children={canon.child_kinds ?? []}
        peers={canon.peer_kinds ?? []}
        kindNameMap={kindNameMap}
        onJump={onJump}
        notes={canon.composition_notes}
      />

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
  const [parents, setParents] = useState((canon.parent_kinds ?? []).join(", "));
  const [children, setChildren] = useState((canon.child_kinds ?? []).join(", "));
  const [peers, setPeers] = useState((canon.peer_kinds ?? []).join(", "));
  const [compNotes, setCompNotes] = useState(canon.composition_notes ?? "");
  const [status, setStatus] = useState(canon.status);
  const [busy, setBusy] = useState(false);

  const toLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  const toCsv = (s: string) => s.split(",").map((l) => l.trim().toLowerCase()).filter(Boolean);

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
        parent_kinds: toCsv(parents),
        child_kinds: toCsv(children),
        peer_kinds: toCsv(peers),
        composition_notes: compNotes || null,
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

      <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Knowledge graph (entity kinds, comma-separated)</div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Parent kinds"><Input value={parents} onChange={(e) => setParents(e.target.value)} placeholder="e.g. project, campaign" /></Field>
          <Field label="Child kinds"><Input value={children} onChange={(e) => setChildren(e.target.value)} placeholder="e.g. task, outcome" /></Field>
          <Field label="Peer kinds"><Input value={peers} onChange={(e) => setPeers(e.target.value)} placeholder="e.g. jtbd" /></Field>
        </div>
        <Field label="Composition notes"><Input value={compNotes} onChange={(e) => setCompNotes(e.target.value)} placeholder="Nuance about how it composes" /></Field>
      </div>

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

function NewEntityKindSheet({ userId, onCreated }: { userId: string | null; onCreated: (kind: string) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("");
  const [name, setName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [busy, setBusy] = useState(false);

  const slug = kind.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");

  async function create() {
    if (!slug || !name.trim()) {
      toast.error("Slug and display name are required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("entity_canon").insert({
      entity_kind: slug,
      display_name: name.trim(),
      one_liner: oneLiner.trim() || null,
      status: "draft",
      updated_by: userId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Canon created: ${name}`);
    setOpen(false);
    setKind(""); setName(""); setOneLiner("");
    onCreated(slug);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="bg-iris text-white"><Plus className="mr-1.5 h-3.5 w-3.5" /> New entity kind</Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>New entity kind</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <Field label="Entity kind (slug, immutable)">
            <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="e.g. engagement_plan" />
            {kind && <p className="text-[11px] text-muted-foreground">Will be saved as <code className="rounded bg-muted px-1">{slug}</code></p>}
          </Field>
          <Field label="Display name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engagement Plan" />
          </Field>
          <Field label="One-liner">
            <Textarea rows={3} value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="A single sentence describing this entity." />
          </Field>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy} className="bg-iris text-white">{busy ? "Creating…" : "Create"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
