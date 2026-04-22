import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Sparkles, Plus, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sb } from "@/lib/sb";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/excellence")({
  component: ExcellenceSettings,
});

type SubjectKind = "domain" | "tenet" | "component";
type MaturityLevel =
  | "L1 Lacking"
  | "L2 Learning"
  | "L3 Launching"
  | "L4 Leveraging"
  | "L5 Leading";

const LEVELS: MaturityLevel[] = [
  "L1 Lacking",
  "L2 Learning",
  "L3 Launching",
  "L4 Leveraging",
  "L5 Leading",
];

interface Industry { id: string; name: string; slug: string }
interface Subject { id: string; name: string }
interface Perspective { id: string; code: string; name: string; sort_order: number }
interface RubricCell {
  id: string;
  subject_kind: SubjectKind;
  subject_id: string;
  level: MaturityLevel;
  perspective_id: string;
  excellence_definition: string | null;
  checklist_items: string[];
}

function ExcellenceSettings() {
  const [kind, setKind] = useState<SubjectKind>("domain");
  const [subjectId, setSubjectId] = useState<string>("");

  const industriesQ = useQuery({
    queryKey: ["settings-industries"],
    queryFn: async () => {
      const { data, error } = await sb.from("industries").select("id, name, slug").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Industry[];
    },
  });

  const subjectsQ = useQuery({
    queryKey: ["settings-subjects", kind],
    queryFn: async () => {
      if (kind === "domain") {
        const { data, error } = await sb.from("domains").select("id, name").order("sort_order");
        if (error) throw error;
        return (data ?? []) as Subject[];
      }
      if (kind === "tenet") {
        const { data, error } = await sb.from("tenets").select("id, name").order("sort_order");
        if (error) throw error;
        return (data ?? []) as Subject[];
      }
      const { data, error } = await sb.from("components").select("id, name").order("name").limit(200);
      if (error) throw error;
      return (data ?? []) as Subject[];
    },
  });

  const perspectivesQ = useQuery({
    queryKey: ["settings-perspectives"],
    queryFn: async () => {
      const { data, error } = await sb.from("excellence_perspectives").select("id, code, name, sort_order").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Perspective[];
    },
  });

  const cellsQ = useQuery({
    queryKey: ["settings-cells", kind, subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("excellence_rubric")
        .select("id, subject_kind, subject_id, level, perspective_id, excellence_definition, checklist_items")
        .eq("subject_kind", kind)
        .eq("subject_id", subjectId);
      if (error) throw error;
      return (data ?? []) as RubricCell[];
    },
  });

  const cellMap = useMemo(() => {
    const m = new Map<string, RubricCell>();
    (cellsQ.data ?? []).forEach((c) => m.set(`${c.level}|${c.perspective_id}`, c));
    return m;
  }, [cellsQ.data]);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Excellence Editor</h1>
          <p className="text-sm text-muted-foreground">
            Define what excellent looks like at L1→L5 across the 5 Ps for each Domain, Tenet, and Component.
          </p>
        </div>
        <Link to="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Settings
        </Link>
      </div>

      <Card className="panel-raised mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Subject kind
          </label>
          <Select value={kind} onValueChange={(v) => { setKind(v as SubjectKind); setSubjectId(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="domain">Domain</SelectItem>
              <SelectItem value="tenet">Tenet</SelectItem>
              <SelectItem value="component">Component</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[260px] flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kind === "domain" ? "Domain" : kind === "tenet" ? "Tenet" : "Component"}
          </label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder={`Pick a ${kind}`} />
            </SelectTrigger>
            <SelectContent>
              {(subjectsQ.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{industriesQ.data?.length ?? 0} industries · {(subjectsQ.data ?? []).length} {kind}s</span>
          {subjectId && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={async () => {
                const { data, error } = await sb.rpc("seed_excellence_defaults" as never, {
                  _subject_kind: kind,
                  _subject_id: subjectId,
                } as never);
                if (error) toast.error(error.message);
                else {
                  toast.success(`Seeded ${data ?? 0} new cell(s)`);
                  cellsQ.refetch();
                }
              }}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Seed defaults
            </Button>
          )}
        </div>
      </Card>

      {!subjectId ? (
        <Card className="panel-raised p-10 text-center text-sm text-muted-foreground">
          Pick a {kind} above to start editing its excellence rubric.
        </Card>
      ) : cellsQ.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-surface-raised/60 p-2">
          <table className="w-full min-w-[1100px] table-fixed border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="w-32 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Level / Lens
                </th>
                {(perspectivesQ.data ?? []).map((p) => (
                  <th key={p.id} className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.code} · {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((lvl) => (
                <tr key={lvl}>
                  <td className="align-top px-2 py-1.5 text-xs font-semibold">{lvl}</td>
                  {(perspectivesQ.data ?? []).map((p) => {
                    const cell = cellMap.get(`${lvl}|${p.id}`);
                    return (
                      <td key={p.id} className="align-top rounded-lg border border-border/60 bg-surface p-2">
                        <CellEditor
                          subjectKind={kind}
                          subjectId={subjectId}
                          level={lvl}
                          perspectiveId={p.id}
                          cell={cell}
                          onSaved={() => cellsQ.refetch()}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CellEditor({
  subjectKind,
  subjectId,
  level,
  perspectiveId,
  cell,
  onSaved,
}: {
  subjectKind: SubjectKind;
  subjectId: string;
  level: MaturityLevel;
  perspectiveId: string;
  cell: RubricCell | undefined;
  onSaved: () => void;
}) {
  const [definition, setDefinition] = useState(cell?.excellence_definition ?? "");
  const [checklist, setChecklist] = useState((cell?.checklist_items ?? []).join("\n"));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const items = checklist
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cell) {
      const { error } = await sb
        .from("excellence_rubric")
        .update({
          excellence_definition: definition || null,
          checklist_items: items,
        } as never)
        .eq("id", cell.id);
      if (error) toast.error(error.message);
      else toast.success("Saved");
    } else {
      const { error } = await sb
        .from("excellence_rubric")
        .insert({
          subject_kind: subjectKind,
          subject_id: subjectId,
          level,
          perspective_id: perspectiveId,
          excellence_definition: definition || null,
          checklist_items: items,
        } as never);
      if (error) toast.error(error.message);
      else toast.success("Created");
    }
    setBusy(false);
    onSaved();
  }

  async function remove() {
    if (!cell) return;
    setBusy(true);
    const { error } = await sb.from("excellence_rubric").delete().eq("id", cell.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      setDefinition("");
      setChecklist("");
    }
    setBusy(false);
    onSaved();
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="What excellent looks like…"
        className="min-h-[44px] resize-y text-[11px] leading-snug"
      />
      <Textarea
        value={checklist}
        onChange={(e) => setChecklist(e.target.value)}
        placeholder="One checklist item per line"
        className="min-h-[60px] resize-y text-[11px] leading-snug"
      />
      <div className="flex items-center justify-between gap-1">
        <Button size="sm" variant="ghost" disabled={busy} onClick={save} className="h-6 gap-1 px-1.5 text-[10px]">
          {cell ? <Save className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {cell ? "Save" : "Add"}
        </Button>
        {cell && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={remove} className="h-6 gap-1 px-1.5 text-[10px] text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
