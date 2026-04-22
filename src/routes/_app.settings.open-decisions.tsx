import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { PageHeader } from "@/components/page-header";
import { Chip } from "@/components/chips";
import { Scale } from "lucide-react";

export const Route = createFileRoute("/_app/settings/open-decisions")({
  component: OpenDecisionsPage,
});

interface Decision {
  id: string;
  title: string;
  area: string;
  current_position: string | null;
  status: "open" | "exploring" | "calibrating" | "settled" | string;
  notes: string | null;
}

function statusTone(status: string): "neutral" | "iris" | "warning" | "success" {
  if (status === "settled") return "success";
  if (status === "calibrating") return "iris";
  if (status === "exploring") return "warning";
  return "neutral";
}

function OpenDecisionsPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["open-decisions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("open_decisions")
        .select("id, title, area, current_position, status, notes")
        .order("sort_order", { ascending: true });
      return (data ?? []) as Decision[];
    },
  });

  const grouped = rows.reduce<Record<string, Decision[]>>((acc, r) => {
    (acc[r.area] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5 px-6 pt-5 pb-8">
      <PageHeader
        title="Open decisions"
        icon={<Scale className="h-5 w-5" />}
        purpose="What we have not yet settled. Marking these honestly is part of the architecture, not a failure. Update as we calibrate."
        whatYouCanDo={[
          "Read the current position on each unresolved rule",
          "Move items toward 'settled' as evidence accrues",
          "Cite these when a decision needs an explicit owner",
        ]}
      />

      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No open decisions tracked yet.
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([area, items]) => (
            <section key={area} className="panel-raised p-5">
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {area}
              </h2>
              <ul className="divide-y divide-border">
                {items.map((d) => (
                  <li key={d.id} className="py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold">{d.title}</h3>
                      <Chip tone={statusTone(d.status)}>{d.status}</Chip>
                    </div>
                    {d.current_position && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.current_position}
                      </p>
                    )}
                    {d.notes && (
                      <p className="mt-1 text-xs text-foreground/70">{d.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
