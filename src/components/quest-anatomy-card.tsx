import { Compass, Clock, FileText, ArrowRight } from "lucide-react";

interface Props {
  journeyName?: string | null;
  questNumber?: number | null;
  fromLevel?: string | null;
  toLevel?: string | null;
  durationMinutes?: number | null;
  deliverableType?: string | null;
  isTemplate?: boolean | null;
  kind?: string | null;
}

/**
 * Quest Anatomy — single-line summary of Journey × Level transition × Duration × Deliverable.
 * Mounted at the top of /quests/$id and used as a chip row on /quests index.
 */
export function QuestAnatomyCard({
  journeyName,
  questNumber,
  fromLevel,
  toLevel,
  durationMinutes,
  deliverableType,
  isTemplate,
  kind,
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {kind && (
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kind}
          </span>
        )}
        {isTemplate ? (
          <span className="rounded-full bg-iris/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--iris-violet)]">
            Template
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            Instance
          </span>
        )}
        {journeyName && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Compass className="h-3 w-3" />
            {journeyName}
            {questNumber ? ` · Quest #${questNumber}` : null}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {fromLevel && toLevel && (
          <div className="inline-flex items-center gap-1.5">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{fromLevel}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="rounded-full bg-iris/15 px-2 py-0.5 text-[11px] font-medium text-[color:var(--iris-violet)]">{toLevel}</span>
          </div>
        )}
        {durationMinutes != null && (
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            ~{durationMinutes} min
          </div>
        )}
        {deliverableType && (
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            Deliverable: <span className="font-medium text-foreground">{deliverableType}</span>
          </div>
        )}
      </div>
    </section>
  );
}
