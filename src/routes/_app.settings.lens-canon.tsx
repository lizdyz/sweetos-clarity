import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, BookOpenCheck, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import type { Lens, LensCanon, LensSubjectKind } from "@/lib/lens-types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/lens-canon")({
  component: LensCanonPage,
});

type SubjectRow = { id: string; name: string; slug?: string };

const SUBJECT_TABS: Array<{ kind: LensSubjectKind; label: string; table: string }> = [
  { kind: "tenet", label: "Tenets", table: "tenets" },
  { kind: "domain", label: "Domains", table: "domains" },
  { kind: "component", label: "Components", table: "components" },
];

function LensCanonPage() {
  const [activeKind, setActiveKind] = useState<LensSubjectKind>("tenet");
  const [selected, setSelected] = useState<{ lensId: string; subjectId: string } | null>(null);

  const { data: lenses } = useQuery({
    queryKey: ["lenses"],
    queryFn: async () => {
      const { data, error } = await sb.from("lenses").select("*").eq("enabled", true).order("sort_order");
      if (error) throw error;
      return data as Lens[];
    },
  });

  const activeTab = SUBJECT_TABS.find((t) => t.kind === activeKind)!;

  const { data: subjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ["lens-canon-subjects", activeTab.table],
    queryFn: async () => {
      const cols = activeTab.table === "components" ? "id, name" : "id, slug, name";
      const order = activeTab.table === "components" ? "name" : "sort_order";
      const { data, error } = await sb.from(activeTab.table).select(cols).order(order, { ascending: true }).limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as SubjectRow[];
    },
  });

  const { data: canonRows, isLoading: loadingCanon } = useQuery({
    queryKey: ["lens-canon-matrix", activeKind],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lens_canon")
        .select("*")
        .eq("subject_kind", activeKind);
      if (error) throw error;
      return data as unknown as LensCanon[];
    },
  });

  const canonMap = useMemo(() => {
    const m = new Map<string, LensCanon>();
    (canonRows ?? []).forEach((c) => m.set(`${c.lens_id}::${c.subject_id}`, c));
    return m;
  }, [canonRows]);

  const selectedCanon = selected ? canonMap.get(`${selected.lensId}::${selected.subjectId}`) ?? null : null;
  const selectedLens = selected ? lenses?.find((l) => l.id === selected.lensId) : null;
  const selectedSubject = selected ? subjects?.find((s) => s.id === selected.subjectId) : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Lens Canon</h1>
        <p className="text-sm text-muted-foreground">
          Curated best-practice perspectives per (Lens × Subject). Canon shows first on every detail page — AI fires only on demand.
        </p>
      </header>

      <Tabs value={activeKind} onValueChange={(v) => { setActiveKind(v as LensSubjectKind); setSelected(null); }}>
        <TabsList>
          {SUBJECT_TABS.map((t) => (
            <TabsTrigger key={t.kind} value={t.kind}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="panel-raised overflow-hidden p-0">
        {loadingSubjects || loadingCanon ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading matrix…
          </div>
        ) : !subjects?.length ? (
          <div className="p-6 text-sm text-muted-foreground">No {activeTab.label.toLowerCase()} found.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-card">
                <tr>
                  <th className="border-b border-border/60 p-2 text-left font-semibold">Lens</th>
                  {subjects.map((s) => (
                    <th key={s.id} className="border-b border-border/60 p-2 text-left font-medium text-muted-foreground" title={s.name}>
                      <div className="max-w-[140px] truncate">{s.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(lenses ?? []).map((lens) => (
                  <tr key={lens.id}>
                    <td className="border-b border-border/40 p-2 font-medium" style={{ color: lens.accent_color }}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase">{lens.code}</span>
                        <span>{lens.name}</span>
                      </div>
                    </td>
                    {subjects.map((s) => {
                      const c = canonMap.get(`${lens.id}::${s.id}`);
                      const isSel = selected?.lensId === lens.id && selected?.subjectId === s.id;
                      return (
                        <td key={s.id} className="border-b border-border/40 p-1">
                          <button
                            type="button"
                            onClick={() => setSelected({ lensId: lens.id, subjectId: s.id })}
                            className={cn(
                              "h-7 w-full rounded-md border text-[10px] font-medium transition",
                              isSel && "ring-2 ring-primary ring-offset-1",
                              c?.status === "active" && c.source === "curated" && "border-success/40 bg-success/10 text-success",
                              c?.status === "active" && c.source === "promoted_from_ai" && "border-primary/40 bg-primary/10 text-primary",
                              c?.status === "draft" && "border-warning/40 bg-warning/10 text-warning",
                              !c && "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60",
                            )}
                            title={c ? `${c.source} · ${c.status}` : "No canon yet"}
                          >
                            {c ? (c.source === "promoted_from_ai" ? "AI→" : "✓") : "·"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <LegendDot className="border-success/40 bg-success/10" /> Active · curated
        <LegendDot className="border-primary/40 bg-primary/10" /> Active · promoted from AI
        <LegendDot className="border-warning/40 bg-warning/10" /> Draft
        <LegendDot className="border-border/50 bg-muted/30" /> Empty
      </div>

      {selected && selectedLens && selectedSubject && (
        <CanonEditor
          key={`${selected.lensId}::${selected.subjectId}`}
          lens={selectedLens}
          subject={selectedSubject}
          subjectKind={activeKind}
          existing={selectedCanon}
        />
      )}
    </div>
  );
}

function LegendDot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-3 w-5 rounded-md border", className)} />;
}

function CanonEditor({
  lens,
  subject,
  subjectKind,
  existing,
}: {
  lens: Lens;
  subject: SubjectRow;
  subjectKind: LensSubjectKind;
  existing: LensCanon | null;
}) {
  const qc = useQueryClient();
  const [perspective, setPerspective] = useState(existing?.perspective_md ?? "");
  const [quickFacts, setQuickFacts] = useState((existing?.quick_facts ?? []).join("\n"));
  const [keyQs, setKeyQs] = useState((existing?.key_questions ?? []).join("\n"));
  const [watchOuts, setWatchOuts] = useState((existing?.watch_outs ?? []).join("\n"));
  const [nextActions, setNextActions] = useState((existing?.next_actions ?? []).join("\n"));
  const [status, setStatus] = useState<LensCanon["status"]>(existing?.status ?? "draft");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        lens_id: lens.id,
        subject_kind: subjectKind,
        subject_id: subject.id,
        perspective_md: perspective.trim() || null,
        quick_facts: toLines(quickFacts),
        key_questions: toLines(keyQs),
        watch_outs: toLines(watchOuts),
        next_actions: toLines(nextActions),
        status,
        notes: notes.trim() || null,
        source: existing?.source ?? "curated",
        stages_breakdown: existing?.stages_breakdown ?? [],
      };
      const { error } = await sb
        .from("lens_canon")
        .upsert(payload, { onConflict: "lens_id,subject_kind,subject_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-canon-matrix", subjectKind] });
      qc.invalidateQueries({ queryKey: ["lens-canon", subjectKind, subject.id] });
      toast.success("Canon saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="panel-raised space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: lens.accent_color }}>
              {lens.code} · {lens.name}
            </h2>
            <span className="text-muted-foreground">×</span>
            <h2 className="text-sm font-semibold tracking-tight">{subject.name}</h2>
            {existing?.source === "promoted_from_ai" && (
              <Badge variant="outline" className="gap-1 border-violet-500/40 text-[10px] text-violet-600 dark:text-violet-300">
                <Sparkles className="h-3 w-3" /> Promoted from AI
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{lens.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value as LensCanon["status"])}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
          </select>
          <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save canon
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Perspective (markdown)">
          <Textarea value={perspective} onChange={(e) => setPerspective(e.target.value)} rows={8} className="font-mono text-xs" />
        </Field>
        <Field label="Quick facts (one per line)">
          <Textarea value={quickFacts} onChange={(e) => setQuickFacts(e.target.value)} rows={4} className="text-xs" />
        </Field>
        <Field label="Key questions (one per line)">
          <Textarea value={keyQs} onChange={(e) => setKeyQs(e.target.value)} rows={4} className="text-xs" />
        </Field>
        <Field label="Watch-outs (one per line)">
          <Textarea value={watchOuts} onChange={(e) => setWatchOuts(e.target.value)} rows={4} className="text-xs" />
        </Field>
        <Field label="Next actions (one per line)">
          <Textarea value={nextActions} onChange={(e) => setNextActions(e.target.value)} rows={4} className="text-xs" />
        </Field>
        <Field label="Curator notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" />
        </Field>
      </div>

      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <BookOpenCheck className="h-3 w-3" />
        Stages breakdown is preserved as-is (edit per-stage detail by promoting an AI take, or extend this editor later).
      </p>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function toLines(s: string): string[] {
  return s.split("\n").map((l) => l.trim()).filter(Boolean);
}
