import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { StoryTrail } from "@/components/story-trail";
import { ScopeChip } from "@/components/scope-chip";
import { CanonGuardrail } from "@/components/canon-guardrail";
import { QuestAnatomyCard } from "@/components/quest-anatomy-card";
import { Workflow, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/quests/$id")({
  component: QuestDetail,
});

interface QuestRow {
  id: string;
  name: string;
  scope: string | null;
  relationship_id: string | null;
  core_workflow_id: string | null;
  related_components: string[] | null;
  kind: string | null;
  is_template: boolean | null;
  quest_number: number | null;
  from_level: string | null;
  to_level: string | null;
  duration_minutes: number | null;
  deliverable_type: string | null;
  journey_id: string | null;
}

function QuestDetail() {
  const { id } = Route.useParams();

  const { data: quest } = useQuery({
    queryKey: ["quests", "header", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, name, scope, relationship_id, core_workflow_id, related_components, kind, is_template, quest_number, from_level, to_level, duration_minutes, deliverable_type, journey_id")
        .eq("id", id)
        .maybeSingle();
      return data as unknown as QuestRow | null;
    },
  });

  const { data: workflow } = useQuery({
    queryKey: ["workflows", "ref", quest?.core_workflow_id],
    enabled: Boolean(quest?.core_workflow_id),
    queryFn: async () => {
      const { data } = await supabase
        .from("workflows")
        .select("id, name, status")
        .eq("id", quest!.core_workflow_id!)
        .maybeSingle();
      return data as { id: string; name: string; status: string | null } | null;
    },
  });

  const { data: components = [] } = useQuery({
    queryKey: ["components", "by-quest-detail", id, quest?.related_components?.join(",")],
    enabled: Boolean(quest?.related_components?.length),
    queryFn: async () => {
      const { data } = await supabase
        .from("components")
        .select("id, name, current_maturity_level")
        .in("id", quest!.related_components!);
      return (data ?? []) as Array<{
        id: string;
        name: string;
        current_maturity_level: string | null;
      }>;
    },
  });

  return (
    <div className="space-y-5">
      <div className="px-6 pt-5">
        <CanonGuardrail entityKind="quest" />
      </div>
      {quest && (
        <div className="px-6">
          <QuestAnatomyCard
            questNumber={quest.quest_number}
            fromLevel={quest.from_level}
            toLevel={quest.to_level}
            durationMinutes={quest.duration_minutes}
            deliverableType={quest.deliverable_type}
            isTemplate={quest.is_template}
            kind={quest.kind}
          />
        </div>
      )}
      {quest && (
        <section className="panel-raised mx-6 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ScopeChip scope={quest.scope} relationshipId={quest.relationship_id} size="sm" />
            {workflow ? (
              <Link
                to="/workflows/$id"
                params={{ id: workflow.id }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:border-[color:var(--iris-violet)]/40 hover:text-[color:var(--iris-violet)]"
              >
                <Workflow className="h-3 w-3" />
                Core workflow · {workflow.name}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
                <Workflow className="h-3 w-3" />
                No core workflow set
              </span>
            )}
          </div>
          {components.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Components advanced
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm">
                {components.map((c, i) => (
                  <span key={c.id} className="inline-flex items-center gap-1 text-muted-foreground">
                    {i > 0 && <ArrowRight className="h-3 w-3" />}
                    <Link
                      to="/components/$id"
                      params={{ id: c.id }}
                      className="font-medium text-foreground hover:text-[color:var(--iris-violet)]"
                    >
                      {c.name}
                    </Link>
                    {c.current_maturity_level && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                        {c.current_maturity_level}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      <EntityDetailPage entityKey="quests" />
      <div className="px-6 pb-8">
        <StoryTrail subjectKind="quest" subjectId={id} />
      </div>
    </div>
  );
}
