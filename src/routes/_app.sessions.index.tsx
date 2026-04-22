import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon } from "lucide-react";
import { sb as supabase } from "@/lib/sb";
import { EntityListPage } from "@/components/entity-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/sessions/")({
  component: SessionsIndex,
});

function SessionsIndex() {
  const [serviceType, setServiceType] = useState<string | null>(null);

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["session_template_service_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_templates" as never)
        .select("service_type")
        .eq("enabled", true);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: { service_type: string | null }) => {
        if (r.service_type) set.add(r.service_type);
      });
      return Array.from(set).sort();
    },
  });

  // Pull templates for the selected service_type so we can filter sessions client-side
  // by their session_template_id (sessions don't have service_type directly).
  const { data: templateIdsForServiceType } = useQuery({
    queryKey: ["session_templates_by_service_type", serviceType],
    enabled: !!serviceType,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_templates" as never)
        .select("id")
        .eq("enabled", true)
        .eq("service_type", serviceType!);
      if (error) throw error;
      return new Set((data ?? []).map((r: { id: string }) => r.id));
    },
  });

  const filterFn = useMemo(() => {
    if (!serviceType || !templateIdsForServiceType) return undefined;
    return (row: Record<string, unknown>) => {
      const tplId = row.session_template_id as string | null | undefined;
      return !!tplId && templateIdsForServiceType.has(tplId);
    };
  }, [serviceType, templateIdsForServiceType]);

  return (
    <div className="space-y-3">
      <div className="px-6 pt-6">
        <PageHeader
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Sessions Bank"
          purpose="All Mirror, Map, Machine, and Sync sessions — past, scheduled, and templated. Sessions advance the underlying workflow through guided cadence; SweetSync self-paces the same work between them."
          whatYouCanDo={[
            "Filter by service type to focus on Mirror / Map / Machine / Sync",
            "See past sessions, today's live ones (status chip), and what's scheduled",
            "Open a session to capture outcomes, decisions, and Component movement",
          ]}
        />
      </div>
      {serviceTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-6 pt-2">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Service type
          </span>
          <Button
            size="sm"
            variant={serviceType === null ? "default" : "outline"}
            onClick={() => setServiceType(null)}
            className="h-6 px-2 text-[11px]"
          >
            All
          </Button>
          {serviceTypes.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={serviceType === t ? "default" : "outline"}
              onClick={() => setServiceType(t)}
              className="h-6 px-2 text-[11px]"
            >
              {t}
            </Button>
          ))}
        </div>
      )}
      <EntityListPage entityKey="sessions" rowFilter={filterFn} />
    </div>
  );
}
