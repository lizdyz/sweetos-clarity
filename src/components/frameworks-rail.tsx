import { Sparkles, Layers, Radar, Compass, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { OVERLAY_REGISTRY, type Triageable, type OverlayKind } from "@/lib/triageable";

const OVERLAY_ICON: Record<OverlayKind, typeof Sparkles> = {
  "5ps": Layers,
  bizzybot_lens: Sparkles,
  kti_candidate: Radar,
  domain_tenet_fit: Compass,
  decision_readiness: ShieldCheck,
  op_alpha: Zap,
};

interface FrameworksRailProps {
  target: Triageable | null;
  onRunOverlay: (target: Triageable, overlay: OverlayKind) => void;
  className?: string;
}

export function FrameworksRail({ target, onRunOverlay, className }: FrameworksRailProps) {
  return (
    <aside className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-4", className)}>
      <div className="mb-2">
        <h3 className="text-sm font-semibold">Frameworks</h3>
        <p className="text-xs text-muted-foreground">
          {target ? "Run a lens on the selected idea" : "Select an idea to run a lens"}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {OVERLAY_REGISTRY.map((o) => {
          const Icon = OVERLAY_ICON[o.kind];
          const disabled = !target || o.v === 2;
          return (
            <button
              key={o.kind}
              type="button"
              disabled={disabled}
              onClick={() => target && !disabled && onRunOverlay(target, o.kind)}
              className={cn(
                "group flex flex-col items-start gap-0.5 rounded-xl border p-2.5 text-left transition-all",
                disabled
                  ? "cursor-not-allowed opacity-40"
                  : "hover:border-iris hover:bg-iris-soft/40 hover:shadow-sm",
              )}
              title={o.hint}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  <Icon className="h-3.5 w-3.5 text-iris" />
                  {o.label}
                </span>
                {o.v === 2 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                    v2
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground">{o.hint}</span>
            </button>
          );
        })}
      </div>

      {target && target.frames.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Attached frames
          </h4>
          <div className="flex flex-col gap-1.5">
            {target.frames.map((f, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-2">
                <div className="text-[10px] font-medium uppercase tracking-wide text-iris">
                  {f.overlay_kind}
                </div>
                {typeof f.output?.summary === "string" && (
                  <div className="mt-0.5 text-xs">{f.output.summary as string}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
