import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb } from "@/lib/sb";
import { Globe, Flame, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KtiPanel } from "@/components/kti-panel";
import { formatDistanceToNow } from "date-fns";

interface InboundRow {
  id: string;
  source_kind: string;
  source_url: string | null;
  summary: string | null;
  classified_kind: string | null;
  confidence: number | null;
  status: string;
  created_at: string;
}

/**
 * World Watch — per-relationship outside-in surface.
 * Mounts on Relationship detail; surfaces inbound signals classified to this relationship
 * plus universal + scoped KTIs.
 * See `mem://design/sweetscan-as-eyes-and-ears.md`.
 */
export function WorldWatchPanel({ relationshipId }: { relationshipId: string }) {
  const { data: inbound = [] } = useQuery<InboundRow[]>({
    queryKey: ["world-watch", "inbound", relationshipId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("inbound_signals")
        .select("id, source_kind, source_url, summary, classified_kind, confidence, status, created_at")
        .eq("classified_subject_type", "relationship")
        .eq("classified_subject_id", relationshipId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as InboundRow[];
    },
  });

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-[color:var(--iris-violet)]" />
        <h2 className="text-sm font-semibold tracking-tight">World Watch</h2>
        <span className="text-xs text-muted-foreground">
          What the outside world is saying about this client
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="panel-raised p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Flame className="h-3 w-3 text-amber-500" /> Forward radar
          </div>
          <KtiPanel relationshipId={relationshipId} compact />
        </Card>

        <Card className="panel-raised p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Inbox className="h-3 w-3 text-[color:var(--iris-violet)]" /> Inbound for this client
            <span className="ml-auto text-[10px]">{inbound.length}</span>
          </div>
          {inbound.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nothing tagged to this relationship yet. Drop articles, podcasts, or transcripts in{" "}
              <Link to="/capture" className="text-[color:var(--iris-violet)] hover:underline">
                Capture
              </Link>{" "}
              and they'll route here automatically.
            </p>
          ) : (
            <ul className="space-y-1">
              {inbound.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-0.5 rounded-md border border-border/40 bg-card/40 p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-1.5 py-0 text-[9px] uppercase tracking-wider text-muted-foreground">
                      {s.source_kind}
                    </span>
                    {s.classified_kind && (
                      <span className="rounded-full bg-iris-soft px-1.5 py-0 text-[9px]">
                        {s.classified_kind}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-foreground">{s.summary ?? "—"}</p>
                  {s.source_url && (
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[10px] text-[color:var(--iris-violet)] hover:underline"
                    >
                      {s.source_url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
