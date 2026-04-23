import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sb } from "@/lib/sb";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GapCloserRow {
  key: string;
  value: { enabled?: boolean } | null;
}

/**
 * Topbar switch: enables/disables the Gap-Closer scan that pollinates Sparks
 * for entities with coverage gaps. Persists to public.org_settings (key='gap_closer').
 */
export function GapCloserToggle() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["org_settings", "gap_closer"],
    queryFn: async () => {
      const { data } = await sb
        .from("org_settings")
        .select("key, value")
        .eq("key", "gap_closer")
        .maybeSingle();
      return (data ?? null) as GapCloserRow | null;
    },
    staleTime: 30_000,
  });

  const enabled = !!data?.value?.enabled;

  async function setEnabled(next: boolean) {
    const { error } = await sb
      .from("org_settings")
      .upsert({ key: "gap_closer", value: { enabled: next } } as never, {
        onConflict: "key",
      });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next ? "Gap-Closer ON · scan runs every 6h" : "Gap-Closer paused");
    qc.invalidateQueries({ queryKey: ["org_settings", "gap_closer"] });
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => !isLoading && setEnabled(!enabled)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-xl border border-border bg-surface px-2.5 text-sm transition-colors",
              enabled
                ? "border-iris/40 bg-iris-soft/40 text-iris"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Toggle Gap-Closer mode"
          >
            <Sparkles className={cn("h-3.5 w-3.5", enabled && "text-iris")} />
            <span className="hidden text-xs font-medium md:inline">Auto-spark</span>
            <Switch checked={enabled} className="pointer-events-none scale-75" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs">
          <p className="font-semibold">Auto-spark gaps</p>
          <p className="mt-0.5 text-muted-foreground">
            When ON, the system scans active entities every 6 hours and drops Sparks
            wherever coverage is thin (stale captures, missing JTBDs, KTIs without readings).
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
