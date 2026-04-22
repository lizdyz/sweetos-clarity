import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Link } from "@tanstack/react-router";
import { PIPELINE_STAGE } from "@/lib/enums";
import { Compass } from "lucide-react";
import { ConfidenceChip } from "@/components/chips";

export const Route = createFileRoute("/_app/pipeline")({
  component: PipelinePage,
});

interface Rel {
  id: string; name: string; company: string | null; pipeline_stage: string | null;
  next_action: string | null; intelligence_confidence: string | null; mirror_status: string | null;
}

function PipelinePage() {
  const { data } = useQuery<Rel[]>({
    queryKey: ["pipeline", "rels"],
    queryFn: async () => {
      const { data } = await sb.from("relationships").select("*");
      return data ?? [];
    },
  });

  return (
    <div className="px-6 py-5">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Relationships by stage</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGE.map((stage) => {
          const items = (data ?? []).filter((r) => r.pipeline_stage === stage);
          return (
            <div key={stage} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span>{stage}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No relationships
                  </div>
                )}
                {items.map((r) => (
                  <Link
                    key={r.id}
                    to="/relationships/$id"
                    params={{ id: r.id }}
                    className="block panel p-3 text-left transition-all hover:shadow-[var(--shadow-elevated)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{r.name}</div>
                        {r.company && <div className="truncate text-xs text-muted-foreground">{r.company}</div>}
                      </div>
                      <ConfidenceChip value={r.intelligence_confidence} />
                    </div>
                    {r.next_action && (
                      <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">→ {r.next_action}</div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
