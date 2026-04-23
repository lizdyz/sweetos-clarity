// Open Decisions — the live calibration queue (was /settings/open-decisions).
// Promoted to first-class operational surface in Wave 20: actionable rows,
// status cycling, "Settle this" → real Decision creation with provenance.

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { PageHeader } from "@/components/page-header";
import { Scale } from "lucide-react";
import { OpenDecisionRow } from "@/components/decisions/open-decision-row";

export const Route = createFileRoute("/_app/decisions/open")({
  component: OpenDecisionsPage,
});

interface OpenDecision {
  id: string;
  title: string;
  area: string;
  current_position: string | null;
  status: string;
  notes: string | null;
  settled_decision_id: string | null;
}

function OpenDecisionsPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["open-decisions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("open_decisions")
        .select("id, title, area, current_position, status, notes, settled_decision_id")
        .order("sort_order", { ascending: true });
      return (data ?? []) as OpenDecision[];
    },
  });

  const grouped = rows.reduce<Record<string, OpenDecision[]>>((acc, r) => {
    (acc[r.area] ??= []).push(r);
    return acc;
  }, {});

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5 px-6 pt-5 pb-8">
      <PageHeader
        title="Open Decisions"
        icon={<Scale className="h-5 w-5" />}
        purpose="The live calibration queue. Architecture rules we have not yet settled — track them honestly, advance them as evidence accrues, settle them into formal Decisions when ready."
        whatYouCanDo={[
          "Click the status chip to cycle open → exploring → calibrating",
          "Hit 'Settle this' to log a formal Decision with full provenance",
          "Snooze low-priority items so they fade without being lost",
        ]}
        connectsTo={[
          { to: "/decisions", label: "Decisions" },
          { to: "/operate/ocda", label: "OCDA Cockpit" },
          { to: "/audit", label: "Audit Trail" },
        ]}
        nextSteps={[
          `${counts.open ?? 0} to triage`,
          `${counts.calibrating ?? 0} calibrating`,
          `${counts.settled ?? 0} settled`,
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
                  <OpenDecisionRow key={d.id} decision={d} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
