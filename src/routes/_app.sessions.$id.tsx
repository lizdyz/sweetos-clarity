import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityDetailPage } from "@/components/entity-workspace";
import { MeasuresPanel } from "@/components/measures-panel";
import { Calendar, ExternalLink, Layers } from "lucide-react";

export const Route = createFileRoute("/_app/sessions/$id")({
  component: SessionDetail,
});

interface SessionRow {
  id: string;
  name: string | null;
  session_template_id: string | null;
  tagged_components: string[] | null;
}

interface TemplateRow {
  id: string;
  name: string;
  service_type: string | null;
  default_duration_minutes: number;
  linked_workflow_id: string | null;
}

function SessionDetail() {
  const { id } = Route.useParams();

  const { data: session } = useQuery({
    queryKey: ["session-meta", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, name, session_template_id, tagged_components")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as SessionRow | null;
    },
  });

  const templateId = session?.session_template_id ?? null;
  const { data: template } = useQuery({
    queryKey: ["session_template", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_templates" as never)
        .select("id, name, service_type, default_duration_minutes, linked_workflow_id")
        .eq("id", templateId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TemplateRow | null;
    },
  });

  const componentIds = session?.tagged_components ?? [];
  const { data: components = [] } = useQuery({
    queryKey: ["session-components", id, componentIds.join(",")],
    enabled: componentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("components")
        .select("id, name, current_maturity_level")
        .in("id", componentIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; current_maturity_level: string | null }>;
    },
  });

  return (
    <div className="space-y-5">
      <EntityDetailPage entityKey="sessions" />
      <div className="space-y-5 px-6 pb-8">
        {template && (
          <section className="rounded-xl border border-border/60 bg-card/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Session template</h3>
            </div>
            <Link
              to="/session-templates/$id"
              params={{ id: template.id }}
              className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-background p-3 text-sm hover:border-iris/40"
            >
              <span className="font-medium">{template.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {template.service_type ?? "any"} · {template.default_duration_minutes}m
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>
            {template.linked_workflow_id && (
              <Link
                to="/workflows/$id"
                params={{ id: template.linked_workflow_id }}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-[color:var(--iris-violet)] hover:underline"
              >
                <Calendar className="h-3 w-3" />
                Linked workflow
              </Link>
            )}
          </section>
        )}

        {components.length > 0 && (
          <section className="rounded-xl border border-border/60 bg-card/50 p-4">
            <h3 className="mb-2 text-sm font-medium">Components built in this session</h3>
            <div className="flex flex-wrap gap-1.5">
              {components.map((c) => (
                <Link
                  key={c.id}
                  to="/components/$id"
                  params={{ id: c.id }}
                  className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background px-2 py-1 text-[11px] hover:border-iris/40"
                >
                  {c.name}
                  {c.current_maturity_level && (
                    <span className="text-[9px] text-muted-foreground">
                      · {c.current_maturity_level}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <MeasuresPanel subjectType="engagement_service" subjectId={id} title="Session measures" />
      </div>
    </div>
  );
}
