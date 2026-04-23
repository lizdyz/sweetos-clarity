import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { sb } from "@/lib/sb";
import { Flame, Workflow as WorkflowIcon, Radar, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface KtiFireRow {
  id: string;
  kti_id: string;
  scanned_at: string;
  observed_value: string | null;
  kti: { id: string; name: string; relationship_id: string | null } | null;
}

interface HandoffRow {
  id: string;
  subject_kind: "task" | "project" | "campaign" | "session" | "workflow_step_run";
  subject_id: string;
  subject_label: string | null;
  created_at: string;
}

interface SignalRow {
  id: string;
  source_kind: string;
  summary: string | null;
  classified_kind: string | null;
  created_at: string;
}

type ChipKind = "kti" | "handoff" | "signal";

interface Chip {
  key: string;
  kind: ChipKind;
  label: string;
  hint?: string;
  occurred_at: string;
  to: string;
  params: Record<string, string>;
}

const SINCE_24H = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

export function LiveSignalStrip({ meOperatorId }: { meOperatorId: string | null }) {
  const ktis = useQuery<KtiFireRow[]>({
    queryKey: ["live-signal", "ktis-24h"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("kti_scans")
        .select("id, kti_id, scanned_at, observed_value, kti:key_trend_indicators(id, name, relationship_id)")
        .eq("fired", true)
        .gte("scanned_at", SINCE_24H())
        .order("scanned_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as KtiFireRow[];
    },
  });

  const handoffs = useQuery<HandoffRow[]>({
    queryKey: ["live-signal", "handoffs", meOperatorId],
    queryFn: async () => {
      if (!meOperatorId) return [];
      const { data, error } = await sb
        .from("operator_handoff_inbox")
        .select("id, subject_kind, subject_id, subject_label, created_at")
        .eq("to_operator_id", meOperatorId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as HandoffRow[];
    },
    enabled: !!meOperatorId,
  });

  const signals = useQuery<SignalRow[]>({
    queryKey: ["live-signal", "inbound-24h"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("inbound_signals")
        .select("id, source_kind, summary, classified_kind, created_at")
        .gte("created_at", SINCE_24H())
        .in("status", ["pending", "classified"])
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as SignalRow[];
    },
  });

  const isLoading = ktis.isLoading || handoffs.isLoading || signals.isLoading;

  const chips: Chip[] = [
    ...(ktis.data ?? []).map<Chip>((k) => ({
      key: `kti-${k.id}`,
      kind: "kti",
      label: k.kti?.name ?? "KTI fired",
      hint: k.observed_value ?? undefined,
      occurred_at: k.scanned_at,
      to: "/library/ktis/$id",
      params: { id: k.kti_id },
    })),
    ...(handoffs.data ?? []).map<Chip>((h) => ({
      key: `handoff-${h.id}`,
      kind: "handoff",
      label: h.subject_label ?? "Handoff",
      hint: h.subject_kind.replace("_", " "),
      occurred_at: h.created_at,
      to: subjectTo(h.subject_kind),
      params: { id: h.subject_id },
    })),
    ...(signals.data ?? []).map<Chip>((s) => ({
      key: `signal-${s.id}`,
      kind: "signal",
      label: s.summary ?? s.classified_kind ?? `Signal: ${s.source_kind}`,
      hint: s.source_kind,
      occurred_at: s.created_at,
      to: "/sweetscan",
      params: {},
    })),
  ].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  if (isLoading && chips.length === 0) return null;

  return (
    <section className="panel-raised mb-4 overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Live signals · last 24h</h2>
          {chips.length > 0 && (
            <span className="rounded-full bg-iris-soft px-2 py-0.5 text-[10px] font-medium text-[color:var(--iris-violet)]">
              {chips.length}
            </span>
          )}
        </div>
        <Link
          to="/sweetscan"
          className="inline-flex items-center gap-1 text-[11px] text-[color:var(--iris-violet)] hover:underline"
        >
          <Radar className="h-3 w-3" /> Open SweetScan
        </Link>
      </header>
      {chips.length === 0 ? (
        <div className="px-4 py-3 text-[11px] text-muted-foreground">
          No fires, handoffs, or inbound signals in the last 24h.
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5">
          {chips.map((c) => (
            <SignalChip key={c.key} chip={c} />
          ))}
        </div>
      )}
    </section>
  );
}

function SignalChip({ chip }: { chip: Chip }) {
  const Icon = chip.kind === "kti" ? Flame : chip.kind === "handoff" ? WorkflowIcon : Radar;
  const tone =
    chip.kind === "kti" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" :
    chip.kind === "handoff" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" :
    "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20";
  return (
    <Link
      to={chip.to as never}
      params={chip.params as never}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition hover:shadow-sm",
        tone,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="max-w-[180px] truncate">{chip.label}</span>
      {chip.hint && <span className="hidden truncate text-[10px] opacity-70 sm:inline">· {chip.hint}</span>}
      <span className="text-[10px] opacity-70">· {formatDistanceToNow(new Date(chip.occurred_at), { addSuffix: false })}</span>
    </Link>
  );
}

function subjectTo(kind: HandoffRow["subject_kind"]): string {
  switch (kind) {
    case "task": return "/tasks/$id";
    case "project": return "/projects/$id";
    case "campaign": return "/campaigns/$id";
    case "session": return "/sessions/$id";
    case "workflow_step_run": return "/workflows";
    default: return "/today";
  }
}
