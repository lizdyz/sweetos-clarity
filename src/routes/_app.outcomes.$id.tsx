import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { TimeControls } from "@/components/time-controls";
import { CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/_app/outcomes/$id")({
  component: OutcomeDetail,
});

function OutcomeDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["outcomes", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes")
        .select("created_at, target_date, done_at, auto_completed_at, source_kind, source_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: source } = useQuery({
    queryKey: ["outcomes", "source", id, data?.source_kind, data?.source_id],
    enabled: Boolean(data?.source_id && data?.source_kind && data.source_kind !== "manual"),
    queryFn: async () => {
      const table = data!.source_kind === "quest" ? "quests" : data!.source_kind === "mission" ? "missions" : "journeys";
      const { data: row } = await supabase.from(table).select("id, name").eq("id", data!.source_id!).maybeSingle();
      return row as { id: string; name: string } | null;
    },
  });

  const isDone = Boolean(data?.done_at);

  return (
    <div className="space-y-5">
      <div className="px-6 pt-4">
        <div className="rounded-xl border border-border bg-surface/60 p-3">
          <div className="flex items-center gap-2 text-sm">
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">{isDone ? "Done" : data?.source_kind === "manual" ? "Manual" : "Tracking"}</span>
            {source && data?.source_kind && (
              <span className="text-[12px] text-muted-foreground">
                · Reflects:{" "}
                <Link
                  to={data.source_kind === "quest" ? "/quests/$id" : data.source_kind === "mission" ? "/missions/$id" : "/journeys/$id"}
                  params={{ id: source.id }}
                  className="text-[color:var(--iris-violet)] hover:underline"
                >
                  {source.name}
                </Link>
              </span>
            )}
          </div>
          {isDone && data?.auto_completed_at && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              Auto-completed when the source {data.source_kind} reached Complete on{" "}
              {new Date(data.auto_completed_at).toLocaleDateString()}.
            </div>
          )}
        </div>
      </div>
      {data && (
        <TimeControls
          table="outcomes"
          rowId={id}
          createdAt={data.created_at}
          dueAt={data.target_date}
          dueColumn="target_date"
          doneAt={data.done_at}
          showRecurrence={false}
        />
      )}
      <EntityDetailPage entityKey="outcomes" />
    </div>
  );
}
