import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DueDateChip } from "@/components/due-date-chip";
import { SERVICE_PACKAGE, type ServicePackage } from "@/lib/enums";
import { Package, Sparkles, Target } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

interface Props {
  relationshipId: string;
}

export function ServiceShapeStrip({ relationshipId }: Props) {
  const qc = useQueryClient();

  const { data: rel } = useQuery({
    queryKey: ["relationships", "service-shape", relationshipId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("relationships")
        .select(
          "id, name, service_package, recommended_package, recommendation_rationale, tagged_components, tagged_domains",
        )
        .eq("id", relationshipId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["engagement_services", "by-rel", relationshipId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("engagement_services")
        .select(
          "id, service_type, status, sessions_purchased, sessions_used, start_date, end_date, target_completion_date",
        )
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const componentIds: string[] = (rel?.tagged_components as string[] | undefined) ?? [];
  const { data: components = [] } = useQuery({
    queryKey: ["components", "for-rel", relationshipId, componentIds.join(",")],
    enabled: componentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("components")
        .select("id, name, current_maturity_level")
        .in("id", componentIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: openOutcomes = [] } = useQuery({
    queryKey: ["outcomes", "open-for-rel", relationshipId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("outcomes")
        .select("id, outcome_type, description, target_date, done_at, measured_value")
        .eq("client_id", relationshipId)
        .is("done_at", null)
        .order("target_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<{ service_package: ServicePackage; recommended_package: ServicePackage; recommendation_rationale: string }>) => {
      const { error } = await sb.from("relationships").update(patch).eq("id", relationshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relationships", "service-shape", relationshipId] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [rationale, setRationale] = useState(rel?.recommendation_rationale ?? "");
  useEffect(() => {
    setRationale(rel?.recommendation_rationale ?? "");
  }, [rel?.recommendation_rationale]);

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-3 lg:divide-x divide-border/50">
        {/* HAS */}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Has</h3>
            {rel?.service_package && (
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {rel.service_package}
              </Badge>
            )}
          </div>
          <div className="mb-2">
            <Select
              value={(rel?.service_package as string | null) ?? ""}
              onValueChange={(v) => update.mutate({ service_package: v as ServicePackage })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Set current package…" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_PACKAGE.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {services.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/50 bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
              No engagement services yet.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {services.map((s: { id: string; service_type: string; status: string; sessions_purchased: number | null; sessions_used: number | null; target_completion_date: string | null }) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{s.service_type}</span>
                      <Badge variant="outline" className="h-4 text-[9px]">{s.status}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.sessions_purchased != null
                        ? `${s.sessions_used ?? 0}/${s.sessions_purchased} sessions`
                        : "—"}
                    </div>
                  </div>
                  <DueDateChip due={s.target_completion_date} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* RECOMMENDED */}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended</h3>
          </div>
          <div className="mb-2">
            <Select
              value={(rel?.recommended_package as string | null) ?? ""}
              onValueChange={(v) => update.mutate({ recommended_package: v as ServicePackage })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Recommend a package…" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_PACKAGE.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            onBlur={() => {
              if (rationale !== (rel?.recommendation_rationale ?? "")) {
                update.mutate({ recommendation_rationale: rationale });
              }
            }}
            placeholder="Why this package fits…"
            className="min-h-[64px] text-xs"
          />
        </div>

        {/* DRIVING TOWARD */}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-emerald-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Driving toward</h3>
          </div>
          {components.length === 0 && openOutcomes.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/50 bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
              Tag components or add outcomes to set targets.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {components.map((c: { id: string; name: string; current_maturity_level: string | null }) => (
                <li key={c.id} className="rounded-md border border-border/40 bg-background px-2 py-1.5 text-xs">
                  <Link to="/components/$id" params={{ id: c.id }} className="block">
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 font-medium">{c.name}</span>
                      <Badge variant="outline" className="h-4 text-[9px]">
                        {c.current_maturity_level ?? "L1"}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
              {openOutcomes.map((o: { id: string; outcome_type: string; description: string | null; target_date: string | null }) => (
                <li key={o.id} className="rounded-md border border-border/40 bg-background px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="line-clamp-1 font-medium">{o.outcome_type}</div>
                      {o.description && (
                        <div className="line-clamp-1 text-[10px] text-muted-foreground">{o.description}</div>
                      )}
                    </div>
                    <DueDateChip due={o.target_date} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
