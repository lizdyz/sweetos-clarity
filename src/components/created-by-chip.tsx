import { Bot, Cog, Download, User } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskSource = "manual" | "ai" | "workflow" | "import" | "capture" | "notion" | "external_ai" | string | null | undefined;

interface CreatedByChipProps {
  source: TaskSource;
  className?: string;
}

/**
 * "Created by" pill for Tasks. Tasks can be created by humans, agents,
 * workflows, or imports — this chip makes that origin obvious.
 */
export function CreatedByChip({ source, className }: CreatedByChipProps) {
  const s = (source ?? "manual").toLowerCase();
  const config: { icon: typeof User; label: string; tone: string } =
    s === "ai" || s === "external_ai"
      ? {
          icon: Bot,
          label: "Agent",
          tone: "border-[color:var(--iris-violet)]/30 bg-iris-soft/40 text-foreground",
        }
      : s === "workflow"
        ? {
            icon: Cog,
            label: "Workflow",
            tone: "border-amber-500/30 bg-amber-500/10 text-foreground",
          }
        : s === "import" || s === "notion" || s === "capture"
          ? {
              icon: Download,
              label: s === "capture" ? "Capture" : s === "notion" ? "Notion" : "Import",
              tone: "border-border bg-muted/60 text-muted-foreground",
            }
          : {
              icon: User,
              label: "You",
              tone: "border-emerald-500/30 bg-emerald-500/10 text-foreground",
            };
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        config.tone,
        className,
      )}
      title={`Created by: ${config.label}`}
    >
      <Icon className="h-3 w-3" />
      Created by {config.label}
    </span>
  );
}
