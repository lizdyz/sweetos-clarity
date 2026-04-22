import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PHASES = ["Seed", "Synthesize", "Session", "Sync", "Ship"] as const;
type Phase = (typeof PHASES)[number];

const OWNER_TONE = {
  client: "bg-amber-100 text-amber-800",
  us: "bg-iris-soft text-[color:var(--iris-violet)]",
  both: "bg-emerald-100 text-emerald-700",
} as const;

interface SessionRow {
  id: string;
  name: string;
  relationship_id: string;
  sweetcycle_phase: Phase | null;
  phase_owner: "client" | "us" | "both" | null;
  phase_due_date: string | null;
  phase_blocker: string | null;
}

interface RelRow {
  id: string;
  name: string;
}

interface Props {
  onSelectRelationship: (id: string) => void;
}

export function SweetCycleMultiRelBoard({ onSelectRelationship }: Props) {
  const { data: rels = [] } = useQuery<RelRow[]>({
    queryKey: ["sweetcycle-active-rels"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationships")
        .select("id, name")
        .order("name")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as RelRow[];
    },
  });

  const { data: sessions = [] } = useQuery<SessionRow[]>({
    queryKey: ["sweetcycle-all-sessions"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("sessions")
        .select("id, name, relationship_id, sweetcycle_phase, phase_owner, phase_due_date, phase_blocker")
        .not("sweetcycle_phase", "is", null)
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const blockers = sessions.filter((s) => s.phase_blocker);
  const overdue = sessions.filter(
    (s) => s.phase_due_date && s.phase_due_date < today,
  );

  // Group sessions by relationship and phase.
  const byRel = new Map<string, Map<Phase, SessionRow[]>>();
  for (const s of sessions) {
    if (!s.sweetcycle_phase) continue;
    if (!byRel.has(s.relationship_id))
      byRel.set(s.relationship_id, new Map(PHASES.map((p) => [p, []])));
    byRel.get(s.relationship_id)!.get(s.sweetcycle_phase)!.push(s);
  }
  const activeRels = rels.filter((r) => byRel.has(r.id));

  return (
    <div className="space-y-4">
      {(blockers.length > 0 || overdue.length > 0) && (
        <Card className="panel-raised flex flex-wrap items-center gap-3 p-3 text-xs">
          {blockers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              <span className="font-medium">{blockers.length} blocked</span>
              <span className="text-muted-foreground">awaiting input</span>
            </div>
          )}
          {overdue.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
              <span className="font-medium">{overdue.length} overdue</span>
              <span className="text-muted-foreground">past phase due date</span>
            </div>
          )}
        </Card>
      )}

      {activeRels.length === 0 ? (
        <Card className="border-dashed bg-surface/40 p-10 text-center text-sm text-muted-foreground">
          No sessions in cycle yet across your relationships.
        </Card>
      ) : (
        <Card className="panel-raised overflow-x-auto p-3">
          <div className="min-w-[900px]">
            <div className="mb-2 grid grid-cols-[160px_repeat(5,1fr)] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div>Relationship</div>
              {PHASES.map((p) => (
                <div key={p}>{p}</div>
              ))}
            </div>
            {activeRels.map((rel) => {
              const phaseMap = byRel.get(rel.id)!;
              return (
                <div
                  key={rel.id}
                  className="grid grid-cols-[160px_repeat(5,1fr)] gap-2 border-t border-border/40 py-2"
                >
                  <button
                    onClick={() => onSelectRelationship(rel.id)}
                    className="truncate text-left text-sm font-medium hover:text-[color:var(--iris-violet)]"
                  >
                    {rel.name}
                  </button>
                  {PHASES.map((p) => {
                    const items = phaseMap.get(p) ?? [];
                    return (
                      <div key={p} className="space-y-1">
                        {items.length === 0 ? (
                          <div className="rounded border border-dashed border-border/40 px-1 py-0.5 text-[10px] text-muted-foreground/40">
                            —
                          </div>
                        ) : (
                          items.slice(0, 3).map((s) => (
                            <Link
                              key={s.id}
                              to="/sessions/$id"
                              params={{ id: s.id }}
                              className="block"
                            >
                              <div
                                className={cn(
                                  "truncate rounded border border-border/60 bg-surface px-1.5 py-1 text-[10px] hover:border-[color:var(--iris-violet)]",
                                  s.phase_blocker && "border-amber-400",
                                  s.phase_due_date && s.phase_due_date < today && "border-destructive",
                                )}
                                title={s.name}
                              >
                                <div className="truncate font-medium">{s.name}</div>
                                {s.phase_owner && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "mt-0.5 h-3 px-1 text-[8px]",
                                      OWNER_TONE[s.phase_owner],
                                    )}
                                  >
                                    {s.phase_owner}
                                  </Badge>
                                )}
                              </div>
                            </Link>
                          ))
                        )}
                        {items.length > 3 && (
                          <div className="text-[9px] text-muted-foreground">
                            +{items.length - 3} more
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
