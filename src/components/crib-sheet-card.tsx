import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, AlertTriangle, Gauge, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";
import type { LensSubjectKind } from "@/lib/lens-types";

interface CribSheet {
  id: string;
  tldr: string | null;
  core_principles: string[];
  quick_facts: string[];
  common_pitfalls: string[];
  signature_metrics: string[];
  generated_at: string;
  generated_by_model: string | null;
  version: number;
  is_pinned: boolean;
}

interface CribSheetCardProps {
  subjectKind: LensSubjectKind;
  subjectId: string;
  subjectLabel: string;
}

export function CribSheetCard({ subjectKind, subjectId, subjectLabel }: CribSheetCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["crib-sheet", subjectKind, subjectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("entity_crib_sheets")
        .select("*")
        .eq("subject_kind", subjectKind)
        .eq("subject_id", subjectId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CribSheet | null;
    },
  });

  if (isLoading) {
    return (
      <Card className="panel-raised flex items-center gap-2 p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading crib sheet…
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="panel-raised p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold">No crib sheet yet</h3>
            <p className="text-sm text-muted-foreground">
              Click <em>Generate Lens perspectives</em> below to create the field guide for {subjectLabel}.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="panel-raised p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold tracking-tight">Crib sheet · {subjectLabel}</h3>
          {data.tldr && <p className="mt-1 text-sm text-foreground/80">{data.tldr}</p>}
        </div>
      </div>

      {data.quick_facts.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {data.quick_facts.map((f, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-normal">
              {f}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {data.core_principles.length > 0 && (
          <Section icon={<ListChecks className="h-3.5 w-3.5" />} title="Core principles" items={data.core_principles} />
        )}
        {data.signature_metrics.length > 0 && (
          <Section icon={<Gauge className="h-3.5 w-3.5" />} title="Signature metrics" items={data.signature_metrics} accent />
        )}
        {data.common_pitfalls.length > 0 && (
          <Section
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            title="Common pitfalls"
            items={data.common_pitfalls}
            warn
          />
        )}
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-wide text-muted-foreground">
        v{data.version} · {new Date(data.generated_at).toLocaleDateString()} · {data.generated_by_model ?? "AI"}
        {data.is_pinned && " · pinned"}
      </p>
    </Card>
  );
}

function Section({
  icon,
  title,
  items,
  warn,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  warn?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-3">
      <div
        className={
          "mb-2 flex items-center gap-1.5 text-xs font-medium " +
          (warn
            ? "text-warning-foreground"
            : accent
              ? "text-[color:var(--iris-violet)]"
              : "text-muted-foreground")
        }
      >
        {icon} {title}
      </div>
      <ul className="space-y-1.5 text-xs text-foreground/80">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
