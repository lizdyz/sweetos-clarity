import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, Play } from "lucide-react";
import { sb } from "@/lib/sb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lens, ObjectKind, LensFit } from "@/lib/lens-types";

interface Props {
  objectKind: ObjectKind;
  onPick: (lens: Lens) => void;
}

interface LensWithFit extends Lens {
  fit: LensFit;
  fit_priority: number;
}

export function LensSuggester({ objectKind, onPick }: Props) {
  const [showMore, setShowMore] = useState(false);
  const [showLowValue, setShowLowValue] = useState(false);

  const { data: lenses = [], isLoading } = useQuery<LensWithFit[]>({
    queryKey: ["lenses-for-object", objectKind],
    queryFn: async () => {
      // Get all active lenses + their fit for this object_kind (left join via two queries)
      const { data: allLenses, error: lErr } = await sb
        .from("lenses")
        .select("*")
        .eq("active", true)
        .order("display_priority", { ascending: false })
        .order("sort_order", { ascending: true });
      if (lErr) throw lErr;
      const { data: fits } = await sb
        .from("lens_object_fit")
        .select("lens_id, fit, priority")
        .eq("object_kind", objectKind);
      const fitMap = new Map<string, { fit: LensFit; priority: number }>();
      for (const f of fits ?? []) fitMap.set(f.lens_id, { fit: f.fit, priority: f.priority });
      return (allLenses ?? []).map((l: Lens) => {
        const m = fitMap.get(l.id);
        return {
          ...l,
          fit: (m?.fit ?? "optional") as LensFit,
          fit_priority: m?.priority ?? 0,
        };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading lenses…
      </div>
    );
  }

  const suggested = lenses
    .filter((l) => l.fit === "suggested")
    .sort((a, b) => b.fit_priority - a.fit_priority);
  const optional = lenses
    .filter((l) => l.fit === "optional")
    .sort((a, b) => b.fit_priority - a.fit_priority);
  const lowValue = lenses.filter((l) => l.fit === "low_value");

  return (
    <div className="space-y-3">
      {suggested.length > 0 && (
        <Section title="Suggested" tone="iris">
          {suggested.map((l) => (
            <LensRow key={l.id} lens={l} onPick={onPick} />
          ))}
        </Section>
      )}

      {optional.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            <span>More lenses ({optional.length})</span>
            {showMore ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          {showMore && (
            <div className="mt-1 space-y-1">
              {optional.map((l) => (
                <LensRow key={l.id} lens={l} onPick={onPick} />
              ))}
            </div>
          )}
        </div>
      )}

      {lowValue.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowLowValue((s) => !s)}
            className="text-[10px] text-muted-foreground/70 hover:text-foreground"
          >
            {showLowValue ? "Hide" : "Show all"} ({lowValue.length} low-fit)
          </button>
          {showLowValue && (
            <div className="mt-1 space-y-1 opacity-60">
              {lowValue.map((l) => (
                <LensRow key={l.id} lens={l} onPick={onPick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "iris";
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4
        className={cn(
          "mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide",
          tone === "iris" && "text-iris",
        )}
      >
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function LensRow({ lens, onPick }: { lens: LensWithFit; onPick: (l: Lens) => void }) {
  const accent = lens.accent_color || "var(--iris-violet)";
  return (
    <button
      type="button"
      onClick={() => onPick(lens)}
      className="group flex w-full items-start gap-2 rounded-lg border bg-card p-2 text-left transition-all hover:border-iris hover:shadow-sm"
      title={lens.purpose ?? lens.tagline}
    >
      <span
        className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md text-sm"
        style={{ backgroundColor: `${accent}20`, color: accent }}
      >
        {lens.bizzybot_emoji ?? "🔍"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="px-1 py-0 text-[9px]">
            {lens.code}
          </Badge>
          <span className="truncate text-xs font-semibold">{lens.name}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[10px] leading-tight text-muted-foreground">
          {lens.core_intention ?? lens.tagline}
        </p>
      </div>
      <Play className="mt-1 h-3 w-3 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-iris" />
    </button>
  );
}
