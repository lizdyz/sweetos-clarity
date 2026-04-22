import { useQuery } from "@tanstack/react-query";
import { Clock, Bot, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";

interface Props {
  subjectKind: string;
  subjectId: string;
  limit?: number;
}

interface AuditRow {
  id: string;
  field: string | null;
  change_type: string;
  source: string;
  notes: string | null;
  model: string | null;
  created_at: string;
}

/** Drop-in history panel for any entity. Reads entity_audit_log. */
export function AuditTrailPanel({ subjectKind, subjectId, limit = 20 }: Props) {
  const { data: rows = [] } = useQuery({
    queryKey: ["audit", subjectKind, subjectId, limit],
    queryFn: async () => {
      const { data, error } = await sb
        .from("entity_audit_log")
        .select("id, field, change_type, source, notes, model, created_at")
        .eq("subject_kind", subjectKind)
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  return (
    <Card className="panel-raised p-3">
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Audit trail
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No changes recorded yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const Icon = r.source === "agent" ? Bot : User;
            return (
              <li key={r.id} className="flex items-start gap-2 text-[11px]">
                <Icon className="mt-0.5 h-3 w-3 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="h-4 text-[9px]">
                      {r.change_type}
                    </Badge>
                    {r.field && <span className="text-muted-foreground">· {r.field}</span>}
                    {r.model && <span className="text-muted-foreground">· {r.model}</span>}
                  </div>
                  {r.notes && <div className="mt-0.5 text-muted-foreground">{r.notes}</div>}
                  <div className="text-[10px] text-muted-foreground/70">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
