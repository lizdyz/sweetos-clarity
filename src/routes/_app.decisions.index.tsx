import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-adapter";
import { FileText, Brain } from "lucide-react";
import { sb as supabase } from "@/lib/sb";
import { EntityListPage } from "@/components/entity-workspace";
import { PageHeader } from "@/components/page-header";
import { UniversalFilterBar } from "@/components/universal-filter-bar";
import { universalFilterSchema } from "@/lib/use-universal-filters";
import { TriageCard } from "@/components/triage-card";
import { decisionToTriageable } from "@/lib/triage-adapters";
import { useTriagePromote } from "@/lib/use-triage-promote";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/decisions/")({
  validateSearch: zodValidator(universalFilterSchema),
  component: DecisionsPage,
});

function DecisionsPage() {
  return (
    <div className="space-y-2">
      <div className="space-y-3 px-6 pt-6">
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title="Decisions"
          purpose="A choice you made and why. Decisions are the Decide stage of OCDA — they capture what was chosen, the context, the implications, and what they supersede. Different from Delegation (which is planning to hand off work)."
          whatYouCanDo={[
            'Log "On {date} we decided X because Y"',
            "Link to the project, the supersedes prior decision, and tag domains",
            "Open the OCDA Cockpit to see this in the live decide pipeline",
          ]}
          connectsTo={[
            { to: "/decisions/open", label: "Open Decisions" },
            { to: "/operate/ocda", label: "OCDA Cockpit" },
            { to: "/sandbox", label: "Sandbox" },
            { to: "/audit", label: "Audit Trail" },
          ]}
          nextSteps={["Triage proposed", "Settle open", "Log new"]}
          actions={
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/operate/ocda">
                <Brain className="h-3.5 w-3.5" /> Open OCDA Cockpit
              </Link>
            </Button>
          }
        />
        <UniversalFilterBar
          stateOptions={["proposed", "decided", "superseded", "rolled_back"]}
        />
        <ProposedDecisionsTriageRail />
      </div>
      <EntityListPage entityKey="decisions" />
    </div>
  );
}

function ProposedDecisionsTriageRail() {
  const promote = useTriagePromote();
  const { data: proposed = [] } = useQuery({
    queryKey: ["decisions", "proposed-for-triage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("decisions")
        .select("id, decision, context, status, created_at, ocda_stage")
        .eq("status", "proposed")
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as Array<Parameters<typeof decisionToTriageable>[0]>;
    },
  });
  if (proposed.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Triage — proposed decisions
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Frame and promote with the universal gesture
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {proposed.map((d) => (
          <li key={d.id}>
            <TriageCard
              item={decisionToTriageable(d)}
              onPromote={(item, kind) => promote.mutate({ item, kind })}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
