import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ArrowLeft, Clock } from "lucide-react";
import { SweetCycleBoard, type SweetSession } from "@/components/sweetcycle-board";

export const Route = createFileRoute("/_app/portals/$relationshipId")({
  component: PortalPage,
});

function PortalPage() {
  const { relationshipId } = Route.useParams();

  const { data: rel } = useQuery({
    queryKey: ["rel", relationshipId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationships")
        .select("id, name, company")
        .eq("id", relationshipId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: journey } = useQuery({
    queryKey: ["journey", relationshipId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationship_journey")
        .select("*")
        .eq("relationship_id", relationshipId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", relationshipId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("engagement_services")
        .select("id, service_type, status")
        .eq("relationship_id", relationshipId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const serviceIds = services.map((s: { id: string }) => s.id);
  const { data: sessions = [] } = useQuery({
    queryKey: ["psessions", serviceIds.join(",")],
    enabled: serviceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("sessions")
        .select("id, name, sweetcycle_phase, phase_owner, phase_due_date, phase_blocker, session_date, engagement_service_id")
        .in("engagement_service_id", serviceIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: portals = [] } = useQuery({
    queryKey: ["portals-list", relationshipId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationship_portals")
        .select("*")
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: openTasks = [] } = useQuery({
    queryKey: ["portal-tasks", relationshipId],
    queryFn: async () => {
      const { data: projects } = await sb
        .from("projects")
        .select("id")
        .or(`relationship_id.eq.${relationshipId},client_id.eq.${relationshipId}`);
      const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
      const orParts = [`relationship_id.eq.${relationshipId}`];
      if (projectIds.length) orParts.push(`project_id.in.(${projectIds.join(",")})`);
      const { data, error } = await sb
        .from("tasks")
        .select("id, name, status, due_date, blocked")
        .or(orParts.join(","))
        .limit(20);
      if (error) throw error;
      return (data ?? []).filter(
        (t: { status: string }) =>
          !["Done", "Complete", "Completed", "Cancelled", "Canceled", "Archived"].includes(t.status),
      );
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <Link
        to="/relationships/$id"
        params={{ id: relationshipId }}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to relationship
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{rel?.name ?? "Portal"}</h1>
        {rel?.company && <p className="text-sm text-muted-foreground">{rel.company}</p>}
      </div>

      {/* Stage strip */}
      <Card className="p-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Where you are
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-iris/15 text-[color:var(--iris-violet)] hover:bg-iris/25">
            {journey?.current_stage ?? "Pre-Engagement"}
          </Badge>
          {journey?.current_phase && (
            <span className="text-sm text-muted-foreground">
              · Phase: <span className="font-medium text-foreground">{journey.current_phase}</span>
            </span>
          )}
          {journey?.next_action_due && (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Due {journey.next_action_due}
            </span>
          )}
        </div>
        {journey && (
          <div className="mt-2 text-xs text-muted-foreground">
            {journey.ship_count} of {journey.total_session_count} sessions shipped
          </div>
        )}
      </Card>

      {/* Active services boards */}
      {services
        .filter((s: { status: string }) => s.status === "Active" || s.status === "In Progress")
        .map((service: { id: string; service_type: string }) => {
          const ss = (sessions as (SweetSession & { engagement_service_id: string })[]).filter(
            (s) => s.engagement_service_id === service.id,
          );
          return (
            <Card key={service.id} className="p-5">
              <h2 className="mb-3 text-sm font-semibold tracking-tight">{service.service_type}</h2>
              <SweetCycleBoard sessions={ss} />
            </Card>
          );
        })}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Open tasks */}
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Open work</h2>
          {openTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing open.</p>
          ) : (
            <ul className="space-y-1.5">
              {openTasks.map((t: { id: string; name: string; status: string; due_date: string | null; blocked: boolean }) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background p-2 text-xs"
                >
                  <span className="truncate">{t.name}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {t.blocked && <Badge variant="destructive" className="h-4 px-1 text-[9px]">Blocked</Badge>}
                    {t.due_date && <span>{t.due_date}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Portal history */}
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Portal history</h2>
          {portals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No portals shared yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {portals.map((p: { id: string; kind: string; version: string | null; url: string; created_at: string; delivered_at: string | null }) => (
                <li key={p.id}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background p-2 text-xs transition-colors hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-3 w-3 text-[color:var(--iris-violet)]" />
                      <span className="font-medium">{p.kind}</span>
                      {p.version && <span className="text-muted-foreground">v{p.version}</span>}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
