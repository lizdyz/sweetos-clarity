import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Target } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/measures")({
  component: MeasuresIndex,
});

const KINDS = ["all", "Objective", "KeyResult", "KPI", "CSF"] as const;
const SUBJECT_TYPES = [
  "all",
  "operator",
  "project",
  "task",
  "campaign",
  "workflow",
  "component",
  "relationship",
  "mission",
  "engagement_service",
] as const;
const COLORS = ["all", "green", "amber", "red", "gray"] as const;

interface Row {
  measure_id: string;
  kind: string;
  subject_type: string;
  subject_id: string;
  name: string;
  target_value: number | null;
  latest_value: number | null;
  pct_to_target: number | null;
  status_color: string | null;
  cadence: string;
  last_reading_at: string | null;
}

const DOT: Record<string, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  gray: "bg-muted-foreground/40",
};

function MeasuresIndex() {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [subjectType, setSubjectType] = useState<(typeof SUBJECT_TYPES)[number]>("all");
  const [color, setColor] = useState<(typeof COLORS)[number]>("all");
  const [search, setSearch] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["measure_health_index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measure_health" as never)
        .select("*")
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const filtered = rows.filter((r) => {
    if (kind !== "all" && r.kind !== kind) return false;
    if (subjectType !== "all" && r.subject_type !== subjectType) return false;
    if (color !== "all" && (r.status_color ?? "gray") !== color) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Measures</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} of {rows.length}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-48 text-xs"
        />
        <Select value={kind} onValueChange={(v) => setKind(v as (typeof KINDS)[number])}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k} className="text-xs">
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={subjectType}
          onValueChange={(v) => setSubjectType(v as (typeof SUBJECT_TYPES)[number])}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={color} onValueChange={(v) => setColor(v as (typeof COLORS)[number])}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLORS.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Kind</th>
              <th className="px-3 py-2 font-medium">Subject</th>
              <th className="px-3 py-2 font-medium">Latest</th>
              <th className="px-3 py-2 font-medium">Target</th>
              <th className="px-3 py-2 font-medium">% to target</th>
              <th className="px-3 py-2 font-medium">Cadence</th>
              <th className="px-3 py-2 font-medium">Last reading</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No measures match your filters.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.measure_id} className="border-t border-border/40">
                <td className="px-3 py-2">
                  <span className={cn("inline-block h-2 w-2 rounded-full", DOT[r.status_color ?? "gray"])} />
                </td>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.kind}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.subject_type}</td>
                <td className="px-3 py-2 text-xs">{r.latest_value ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.target_value ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.pct_to_target ?? "—"}{r.pct_to_target ? "%" : ""}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.cadence}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.last_reading_at ? new Date(r.last_reading_at).toLocaleDateString() : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
