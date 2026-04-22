import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Stars, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/spark-templates")({
  component: SparkTemplatesPage,
});

type Template = {
  id: string;
  name: string;
  body_template: string;
  intent: string | null;
  reuse_count: number;
  avg_rating: number | null;
  status: "draft" | "active" | "retired";
  source_kind: "curated" | "promoted_from_ai";
  applicable_maturity_levels: string[];
};

function SparkTemplatesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "retired">("all");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["spark-templates", filter],
    queryFn: async () => {
      let q = supabase
        .from("spark_templates")
        .select("id, name, body_template, intent, reuse_count, avg_rating, status, source_kind, applicable_maturity_levels")
        .order("reuse_count", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Template["status"] }) => {
      const { error } = await supabase.from("spark_templates").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template updated");
      qc.invalidateQueries({ queryKey: ["spark-templates"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <BookOpen className="h-6 w-6" />
            Spark Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated, reusable Spark templates. The generator tries these first before calling AI.
          </p>
        </div>
        <Link to="/settings" className="text-sm text-muted-foreground hover:underline">
          ← Back to settings
        </Link>
      </header>

      <div className="flex gap-2">
        {(["all", "active", "draft", "retired"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates match.</p>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <article key={t.id} className="panel-raised p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{t.name}</h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.status}
                    </Badge>
                    {t.source_kind === "promoted_from_ai" ? (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Stars className="h-2.5 w-2.5" /> promoted
                      </Badge>
                    ) : null}
                    {t.intent ? (
                      <Badge variant="outline" className="text-[10px]">
                        {t.intent}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{t.body_template}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.applicable_maturity_levels.map((m) => (
                      <span key={m} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-semibold tabular-nums">{t.reuse_count}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">uses</div>
                  {t.avg_rating != null ? (
                    <div className="mt-1 text-xs text-muted-foreground">★ {Number(t.avg_rating).toFixed(1)}</div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                {t.status !== "retired" ? (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: t.id, status: "retired" })}>
                    <Archive className="mr-1 h-3 w-3" /> Retire
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: t.id, status: "active" })}>
                    <ArchiveRestore className="mr-1 h-3 w-3" /> Reactivate
                  </Button>
                )}
                {t.status === "draft" ? (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: t.id, status: "active" })}>
                    Activate
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
