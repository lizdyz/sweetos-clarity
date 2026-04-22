import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JTBD {
  id: string;
  statement: string;
  job_type: "functional" | "emotional" | "social";
  context: string | null;
  desired_outcome: string | null;
  current_solution: string | null;
  pain_severity: number | null;
  status: "discovered" | "validated" | "addressed" | "retired";
  related_components: string[];
  related_domains: string[];
}

const TYPE_TONE = {
  functional: "bg-iris-soft text-[color:var(--iris-violet)]",
  emotional: "bg-pink-100 text-pink-700",
  social: "bg-amber-100 text-amber-700",
} as const;

const STATUS_TONE = {
  discovered: "bg-muted text-muted-foreground",
  validated: "bg-blue-100 text-blue-700",
  addressed: "bg-emerald-100 text-emerald-700",
  retired: "bg-muted text-muted-foreground/60",
} as const;

interface JTBDCardProps {
  jtbd: JTBD;
  onClick?: () => void;
  compact?: boolean;
}

export function JTBDCard({ jtbd, onClick, compact = false }: JTBDCardProps) {
  return (
    <Card
      className={cn(
        "panel-raised cursor-pointer p-4 transition-all hover:shadow-md",
        compact && "p-3",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium leading-snug", compact ? "text-xs" : "text-sm")}>
            {jtbd.statement}
          </p>
          {!compact && jtbd.desired_outcome && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              <span className="font-medium">So I can:</span> {jtbd.desired_outcome}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium capitalize", TYPE_TONE[jtbd.job_type])}>
              {jtbd.job_type}
            </span>
            <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium capitalize", STATUS_TONE[jtbd.status])}>
              {jtbd.status}
            </span>
            {jtbd.pain_severity != null && (
              <Badge variant="outline" className="h-4 text-[9px]">
                pain {jtbd.pain_severity}/5
              </Badge>
            )}
            {jtbd.related_components.length > 0 && (
              <Badge variant="secondary" className="h-4 text-[9px]">
                {jtbd.related_components.length} component{jtbd.related_components.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
