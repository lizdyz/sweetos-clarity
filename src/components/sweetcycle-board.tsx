import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, User, Users as UsersIcon, Building2 } from "lucide-react";

export const PHASES = ["Seed", "Synthesize", "Session", "Sync", "Ship"] as const;
export type SweetPhase = (typeof PHASES)[number];

export interface SweetSession {
  id: string;
  name: string;
  sweetcycle_phase: SweetPhase | null;
  phase_owner: "client" | "us" | "both" | null;
  phase_due_date: string | null;
  phase_blocker: string | null;
  session_date: string | null;
}

const PHASE_HINT: Record<SweetPhase, string> = {
  Seed: "Client prep",
  Synthesize: "Our analysis",
  Session: "Live work",
  Sync: "Recap & decide",
  Ship: "Delivered",
};

function OwnerChip({ owner }: { owner: SweetSession["phase_owner"] }) {
  if (!owner) return null;
  const map = {
    client: { label: "Client", Icon: Building2, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    us: { label: "Us", Icon: User, cls: "bg-iris/10 text-[color:var(--iris-violet)]" },
    both: { label: "Both", Icon: UsersIcon, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  } as const;
  const { label, Icon, cls } = map[owner];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

export function SweetCycleBoard({
  sessions,
  emptyHint,
}: {
  sessions: SweetSession[];
  emptyHint?: string;
}) {
  const grouped: Record<SweetPhase, SweetSession[]> = {
    Seed: [],
    Synthesize: [],
    Session: [],
    Sync: [],
    Ship: [],
  };
  sessions.forEach((s) => {
    const ph = (s.sweetcycle_phase ?? "Seed") as SweetPhase;
    if (grouped[ph]) grouped[ph].push(s);
  });

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {emptyHint ?? "No sessions yet for this service."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {PHASES.map((phase) => (
        <div key={phase} className="rounded-xl border border-border/50 bg-card/40 p-2.5">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <div className="text-xs font-semibold tracking-tight">{phase}</div>
              <div className="text-[10px] text-muted-foreground">{PHASE_HINT[phase]}</div>
            </div>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {grouped[phase].length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {grouped[phase].map((s) => (
              <Link
                key={s.id}
                to="/sessions/$id"
                params={{ id: s.id }}
                className="block rounded-lg border border-border/50 bg-background p-2 text-xs shadow-sm transition-all hover:border-iris/40 hover:shadow-[var(--shadow-glow)]"
              >
                <div className="line-clamp-2 font-medium leading-tight">{s.name}</div>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <OwnerChip owner={s.phase_owner} />
                  {s.phase_blocker && (
                    <AlertCircle className="h-3 w-3 text-rose-500" />
                  )}
                </div>
                {(s.phase_due_date || s.session_date) && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {s.phase_due_date ? `Due ${s.phase_due_date}` : s.session_date}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
