import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { History, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionRow {
  id: string;
  version_no: number;
  client_score: number | null;
  liz_score: number | null;
  confidence: string | null;
  gap: number | null;
  notes: string | null;
  source_kind: string;
  recorded_at: string;
}

interface Props {
  assessmentId: string;
}

/**
 * Wave 6 issue #4 — Domain Assessment as a living model.
 * Reads `domain_assessment_versions` to show the evidence trail over time.
 */
export function DomainAssessmentTimeline({ assessmentId }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["domain-assessment-versions", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domain_assessment_versions")
        .select("id, version_no, client_score, liz_score, confidence, gap, notes, source_kind, recorded_at")
        .eq("assessment_id", assessmentId)
        .order("version_no", { ascending: false });
      if (error) return [];
      return (data ?? []) as VersionRow[];
    },
  });

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Assessment timeline</h2>
        </div>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Living model
        </span>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-xl border border-border bg-surface/40 animate-pulse" />
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/40 p-4 text-center text-xs text-muted-foreground">
          No versions yet. Mirror writes v1 — subsequent Sessions and SweetScan signals will append v2+.
        </p>
      ) : (
        <ol className="space-y-2">
          {data.map((v, i) => {
            const prev = data[i + 1];
            const delta = prev && v.client_score != null && prev.client_score != null
              ? v.client_score - prev.client_score
              : 0;
            return (
              <li key={v.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium">
                    v{v.version_no} · <span className="text-muted-foreground">{v.source_kind}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(v.recorded_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                  <span>
                    Client: <span className="font-medium">{v.client_score ?? "—"}</span>
                  </span>
                  <span>
                    Liz: <span className="font-medium">{v.liz_score ?? "—"}</span>
                  </span>
                  {v.confidence && (
                    <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {v.confidence}
                    </span>
                  )}
                  {prev && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-[10px]",
                        delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-muted-foreground",
                      )}
                    >
                      {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : delta < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
                {v.notes && <p className="mt-1 text-[11px] text-muted-foreground">{v.notes}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
