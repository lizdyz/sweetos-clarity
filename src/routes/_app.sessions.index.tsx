import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { EntityListPage } from "@/components/entity-workspace";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-3">
      {serviceTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-6 pt-4">
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
      <EntityListPage entityKey="sessions" />
    </div>
  );
}
