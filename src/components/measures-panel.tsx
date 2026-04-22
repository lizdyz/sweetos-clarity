import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const KINDS = ["Objective", "KeyResult", "KPI", "CSF"] as const;
const DIRECTIONS = ["higher_is_better", "lower_is_better", "hit_target"] as const;
const CADENCES = ["daily", "weekly", "monthly", "quarterly", "per_event"] as const;

export type MeasureSubjectType =
  | "operator"
  | "project"
  | "task"
  | "campaign"
  | "workflow"
  | "component"
  | "relationship"
  | "mission"
  | "engagement_service"
  | "session";

interface MeasureRow {
  id: string;
  kind: string;
  subject_type: string;
  subject_id: string;
  name: string;
  description: string | null;
  target_value: number | null;
  target_unit: string | null;
  baseline_value: number | null;
  current_value: number | null;
  direction: string;
  cadence: string;
  parent_measure_id: string | null;
  due_date: string | null;
  status: string | null;
}

interface HealthRow {
  measure_id: string;
  latest_value: number | null;
  pct_to_target: number | null;
  status_color: string | null;
  last_reading_at: string | null;
}

interface Props {
  subjectType: MeasureSubjectType;
  subjectId: string;
  className?: string;
  title?: string;
}

const STATUS_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  gray: "bg-muted-foreground/40",
};

export function MeasuresPanel({ subjectType, subjectId, className, title }: Props) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: measures = [] } = useQuery({
    queryKey: ["measures", subjectType, subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measures" as never)
        .select("*")
        .eq("subject_type", subjectType)
        .eq("subject_id", subjectId)
        .order("kind")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as MeasureRow[];
    },
    enabled: !!subjectId,
  });

  const measureIds = measures.map((m) => m.id);
  const { data: health = [] } = useQuery({
    queryKey: ["measure_health", measureIds.join(",")],
    queryFn: async () => {
      if (measureIds.length === 0) return [] as HealthRow[];
      const { data, error } = await supabase
        .from("measure_health" as never)
        .select("*")
        .in("measure_id", measureIds);
      if (error) throw error;
      return (data ?? []) as unknown as HealthRow[];
    },
    enabled: measureIds.length > 0,
  });

  const healthById = new Map(health.map((h) => [h.measure_id, h]));

  const objectives = measures.filter((m) => m.kind === "Objective");
  const keyResults = measures.filter((m) => m.kind === "KeyResult");
  const kpis = measures.filter((m) => m.kind === "KPI");
  const csfs = measures.filter((m) => m.kind === "CSF");

  const krsByObjective = new Map<string | null, MeasureRow[]>();
  keyResults.forEach((kr) => {
    const k = kr.parent_measure_id ?? null;
    if (!krsByObjective.has(k)) krsByObjective.set(k, []);
    krsByObjective.get(k)!.push(kr);
  });

  const removeMeasure = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("measures" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measures", subjectType, subjectId] });
      toast.success("Measure removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addReading = useMutation({
    mutationFn: async ({ measureId, value }: { measureId: string; value: number }) => {
      const { error } = await supabase
        .from("measure_readings" as never)
        .insert({ measure_id: measureId, value, source: "manual" } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measure_health"] });
      qc.invalidateQueries({ queryKey: ["measures", subjectType, subjectId] });
      toast.success("Reading recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/50 p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">{title ?? "Measures"}</h3>
          <span className="text-xs text-muted-foreground">{measures.length}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3 w-3" /> Add measure
        </Button>
      </div>

      {measures.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No measures yet. Add an objective, key result, KPI or CSF to track quality and outcomes.
        </p>
      ) : (
        <div className="space-y-4">
          {objectives.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Objectives & Key Results
              </p>
              {objectives.map((obj) => (
                <div key={obj.id} className="rounded-lg border border-border/40 bg-background p-2">
                  <MeasureLine
                    m={obj}
                    health={healthById.get(obj.id)}
                    onRecord={(value) => addReading.mutate({ measureId: obj.id, value })}
                    onRemove={() => removeMeasure.mutate(obj.id)}
                  />
                  {(krsByObjective.get(obj.id) ?? []).map((kr) => (
                    <div key={kr.id} className="ml-4 mt-1 border-l border-border/40 pl-3">
                      <MeasureLine
                        m={kr}
                        health={healthById.get(kr.id)}
                        onRecord={(value) => addReading.mutate({ measureId: kr.id, value })}
                        onRemove={() => removeMeasure.mutate(kr.id)}
                      />
                    </div>
                  ))}
                </div>
              ))}
              {(krsByObjective.get(null) ?? []).map((kr) => (
                <div key={kr.id} className="rounded-lg border border-border/40 bg-background p-2">
                  <MeasureLine
                    m={kr}
                    health={healthById.get(kr.id)}
                    onRecord={(value) => addReading.mutate({ measureId: kr.id, value })}
                    onRemove={() => removeMeasure.mutate(kr.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {kpis.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                KPIs
              </p>
              {kpis.map((m) => (
                <div key={m.id} className="rounded-lg border border-border/40 bg-background p-2">
                  <MeasureLine
                    m={m}
                    health={healthById.get(m.id)}
                    onRecord={(value) => addReading.mutate({ measureId: m.id, value })}
                    onRemove={() => removeMeasure.mutate(m.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {csfs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Critical Success Factors
              </p>
              {csfs.map((m) => (
                <div key={m.id} className="rounded-lg border border-border/40 bg-background p-2">
                  <MeasureLine
                    m={m}
                    health={healthById.get(m.id)}
                    onRecord={(value) => addReading.mutate({ measureId: m.id, value })}
                    onRemove={() => removeMeasure.mutate(m.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {createOpen && (
        <CreateMeasureSheet
          subjectType={subjectType}
          subjectId={subjectId}
          objectives={objectives}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["measures", subjectType, subjectId] });
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MeasureLine({
  m,
  health,
  onRecord,
  onRemove,
}: {
  m: MeasureRow;
  health: HealthRow | undefined;
  onRecord: (value: number) => void;
  onRemove: () => void;
}) {
  const [reading, setReading] = useState("");
  const dot = STATUS_DOT[health?.status_color ?? "gray"];
  const DirIcon =
    m.direction === "higher_is_better"
      ? TrendingUp
      : m.direction === "lower_is_better"
        ? TrendingDown
        : Minus;

  function commitReading() {
    const v = Number(reading);
    if (!Number.isFinite(v)) return;
    onRecord(v);
    setReading("");
  }

  const pct = health?.pct_to_target ?? null;
  const showBar = m.target_value !== null && pct !== null;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
        <span className="text-xs font-medium">{m.name}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.kind}</span>
        <DirIcon className="h-3 w-3 text-muted-foreground" />
        {m.target_value !== null && (
          <span className="text-[11px] text-muted-foreground">
            {health?.latest_value ?? m.current_value ?? "—"} / {m.target_value}
            {m.target_unit ? ` ${m.target_unit}` : ""}
            {pct !== null && <span className="ml-1">({pct}%)</span>}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">· {m.cadence}</span>
        <div className="ml-auto flex items-center gap-1">
          <Input
            type="number"
            step="any"
            placeholder="+ reading"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitReading();
            }}
            className="h-6 w-24 text-[11px]"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {showBar && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all",
              health?.status_color === "green" && "bg-emerald-500",
              health?.status_color === "amber" && "bg-amber-500",
              health?.status_color === "red" && "bg-rose-500",
              (!health?.status_color || health.status_color === "gray") && "bg-muted-foreground/40",
            )}
            style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function CreateMeasureSheet({
  subjectType,
  subjectId,
  objectives,
  onClose,
  onCreated,
}: {
  subjectType: MeasureSubjectType;
  subjectId: string;
  objectives: MeasureRow[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("KPI");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [baselineValue, setBaselineValue] = useState("");
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>("higher_is_better");
  const [cadence, setCadence] = useState<(typeof CADENCES)[number]>("weekly");
  const [parentId, setParentId] = useState<string>("none");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        kind,
        subject_type: subjectType,
        subject_id: subjectId,
        name: name.trim(),
        description: description.trim() || null,
        target_value: targetValue ? Number(targetValue) : null,
        target_unit: targetUnit.trim() || null,
        baseline_value: baselineValue ? Number(baselineValue) : null,
        direction,
        cadence,
        parent_measure_id: kind === "KeyResult" && parentId !== "none" ? parentId : null,
      };
      const { error } = await supabase.from("measures" as never).insert(payload as never);
      if (error) throw error;
      toast.success("Measure created");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add measure</SheetTitle>
          <SheetDescription>
            Track quality with an Objective, Key Result, KPI, or Critical Success Factor.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as (typeof KINDS)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind === "KeyResult" && objectives.length > 0 && (
            <div className="space-y-1.5">
              <Label>Parent Objective</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No parent —</SelectItem>
                  {objectives.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Baseline</Label>
              <Input
                type="number"
                step="any"
                value={baselineValue}
                onChange={(e) => setBaselineValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target</Label>
              <Input
                type="number"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input
                placeholder="%, $, count, days"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as (typeof DIRECTIONS)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cadence</Label>
            <Select value={cadence} onValueChange={(v) => setCadence(v as (typeof CADENCES)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Create measure"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
