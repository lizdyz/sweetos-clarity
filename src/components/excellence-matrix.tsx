import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Loader2, Check, Minus, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaturityThresholdSheet } from "@/components/maturity-threshold-sheet";

export type SubjectKind = "domain" | "tenet" | "component";

export type MaturityLevel =
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

interface Perspective {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface RubricCell {
  id: string;
  level: MaturityLevel;
  perspective_id: string;
  excellence_definition: string | null;
  checklist_items: string[];
}

interface ScoreRow {
  id: string;
  rubric_id: string;
  state: "not_assessed" | "not_met" | "partial" | "met";
  notes: string | null;
}

interface Relationship {
  id: string;
  name: string;
}

interface Props {
  subjectKind: SubjectKind;
  subjectId: string;
  subjectLabel: string;
}

const STATE_NEXT: Record<ScoreRow["state"], ScoreRow["state"]> = {
  not_assessed: "met",
  met: "partial",
  partial: "not_met",
  not_met: "not_assessed",
};

const STATE_ICON: Record<ScoreRow["state"], React.ReactNode> = {
  not_assessed: null,
  met: <Check className="h-3 w-3" />,
  partial: <Minus className="h-3 w-3" />,
  not_met: <X className="h-3 w-3" />,
};

const STATE_CLASS: Record<ScoreRow["state"], string> = {
  not_assessed: "bg-muted/50 text-muted-foreground border-border",
  met: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
  partial: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
  not_met: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40",
};

export function ExcellenceMatrix({ subjectKind, subjectId, subjectLabel }: Props) {
  const [activeRel, setActiveRel] = useState<string>("");
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [thresholdOpen, setThresholdOpen] = useState(false);

  const perspectivesQ = useQuery({
    queryKey: ["excellence-perspectives"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("excellence_perspectives")
        .select("id, code, name, description, sort_order")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Perspective[];
    },
  });

  const rubricQ = useQuery({
    queryKey: ["excellence-rubric", subjectKind, subjectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("excellence_rubric")
        .select("id, level, perspective_id, excellence_definition, checklist_items")
        .eq("subject_kind", subjectKind)
        .eq("subject_id", subjectId)
        .eq("enabled", true);
      if (error) throw error;
      return (data ?? []) as RubricCell[];
    },
  });

  const relsQ = useQuery({
    queryKey: ["matrix-relationships"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationships")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Relationship[];
    },
  });

  useEffect(() => {
    (async () => {
      if (!activeRel || !rubricQ.data?.length) {
        setScores({});
        return;
      }
      const { data, error } = await sb
        .from("excellence_scores")
        .select("id, rubric_id, state, notes")
        .eq("relationship_id", activeRel)
        .in("rubric_id", rubricQ.data.map((r) => r.id));
      if (error) {
        toast.error(error.message);
        return;
      }
      const m: Record<string, ScoreRow> = {};
      ((data ?? []) as ScoreRow[]).forEach((s) => {
        m[s.rubric_id] = s;
      });
      setScores(m);
    })();
  }, [activeRel, rubricQ.data]);

  const cellMap = useMemo(() => {
    const m = new Map<string, RubricCell>();
    (rubricQ.data ?? []).forEach((c) => m.set(`${c.level}|${c.perspective_id}`, c));
    return m;
  }, [rubricQ.data]);

  const currentMaturity = useMemo<MaturityLevel | null>(() => {
    if (!activeRel || !rubricQ.data?.length) return null;
    let highest: MaturityLevel | null = null;
    for (const lvl of LEVELS) {
      const cellsAtLevel = (rubricQ.data ?? []).filter((c) => c.level === lvl);
      if (cellsAtLevel.length === 0) continue;
      const allMet = cellsAtLevel.every((c) => scores[c.id]?.state === "met");
      if (allMet) highest = lvl;
      else break;
    }
    return highest;
  }, [activeRel, rubricQ.data, scores]);

  async function cycleScore(cell: RubricCell) {
    if (!activeRel) {
      toast.error("Pick a relationship first");
      return;
    }
    setSavingId(cell.id);
    const existing = scores[cell.id];
    const next: ScoreRow["state"] = STATE_NEXT[existing?.state ?? "not_assessed"];
    if (existing) {
      const { error } = await sb
        .from("excellence_scores")
        .update({ state: next, assessed_at: new Date().toISOString() } as never)
        .eq("id", existing.id);
      if (error) toast.error(error.message);
      else setScores((s) => ({ ...s, [cell.id]: { ...existing, state: next } }));
    } else {
      const { data, error } = await sb
        .from("excellence_scores")
        .insert({
          relationship_id: activeRel,
          rubric_id: cell.id,
          state: next,
        } as never)
        .select("id, rubric_id, state, notes")
        .single();
      if (error) toast.error(error.message);
      else if (data) setScores((s) => ({ ...s, [cell.id]: data as ScoreRow }));
    }
    setSavingId(null);
  }

  const loading = perspectivesQ.isLoading || rubricQ.isLoading;
  const perspectives = perspectivesQ.data ?? [];
  const cells = rubricQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            Excellence at every level — {subjectLabel}
          </h3>
          <p className="text-xs text-muted-foreground">
            What "excellent" looks like across L1→L5, interrogated by the 5 Ps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentMaturity && (
            <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Current maturity:</span>{" "}
              <span className="font-semibold">{currentMaturity}</span>
            </div>
          )}
          <div className="min-w-[220px]">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assessing for
            </label>
            <Select value={activeRel} onValueChange={setActiveRel}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Pick a relationship" />
              </SelectTrigger>
              <SelectContent>
                {(relsQ.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading rubric…
        </div>
      ) : cells.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-surface/40 p-6 text-center text-sm text-muted-foreground">
          No excellence rubric defined yet for this {subjectKind}. Add cells in{" "}
          <a href="/settings/excellence" className="text-[color:var(--iris-violet)] hover:underline">
            Settings → Excellence
          </a>
          .
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-surface-raised/60 p-2">
          <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="w-32 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Level / Lens
                </th>
                {perspectives.map((p) => (
                  <th
                    key={p.id}
                    className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    title={p.description ?? ""}
                  >
                    {p.code} · {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((lvl) => (
                <tr key={lvl}>
                  <td className="align-top px-2 py-1.5 text-xs font-semibold">{lvl}</td>
                  {perspectives.map((p) => {
                    const cell = cellMap.get(`${lvl}|${p.id}`);
                    if (!cell) {
                      return (
                        <td
                          key={p.id}
                          className="align-top rounded-lg border border-dashed border-border/40 bg-muted/20 p-2 text-[11px] text-muted-foreground"
                        >
                          —
                        </td>
                      );
                    }
                    const score = scores[cell.id];
                    const state = score?.state ?? "not_assessed";
                    return (
                      <td
                        key={p.id}
                        className="align-top rounded-lg border border-border/60 bg-surface p-2"
                      >
                        {cell.excellence_definition && (
                          <p className="mb-1.5 text-[11px] leading-snug text-foreground/90">
                            {cell.excellence_definition}
                          </p>
                        )}
                        {cell.checklist_items.length > 0 && (
                          <ul className="mb-2 space-y-0.5">
                            {cell.checklist_items.map((item, i) => (
                              <li
                                key={i}
                                className="text-[10px] leading-snug text-muted-foreground"
                              >
                                · {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        <button
                          type="button"
                          disabled={!activeRel || savingId === cell.id}
                          onClick={() => cycleScore(cell)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition disabled:opacity-50",
                            STATE_CLASS[state],
                          )}
                          title="Click to cycle: not assessed → met → partial → not met"
                        >
                          {STATE_ICON[state]}
                          {state === "not_assessed" ? "tap to score" : state.replace("_", " ")}
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

      {!activeRel && cells.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          Pick a relationship to start scoring this matrix.
        </p>
      )}
    </div>
  );
}
