import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Workload = {
  open_tasks: number | null;
  blocked_tasks: number | null;
  overdue_tasks: number | null;
  next_due: string | null;
};

export function OperatorCapacityStrip({ operatorId }: { operatorId: string }) {
  const { data } = useQuery<Workload | null>({
    queryKey: ["operator-workload", operatorId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operator_workload")
        .select("open_tasks, blocked_tasks, overdue_tasks, next_due")
        .eq("operator_id", operatorId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Workload | null;
    },
  });

  const open = data?.open_tasks ?? 0;
  const blocked = data?.blocked_tasks ?? 0;
  const overdue = data?.overdue_tasks ?? 0;
  const next = data?.next_due;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <Tile label="Open" value={open} tone="default" />
      <Tile label="Blocked" value={blocked} tone={blocked > 0 ? "danger" : "default"} />
      <Tile label="Overdue" value={overdue} tone={overdue > 0 ? "warn" : "default"} />
      <Tile label="Next due" value={next ? formatDate(next) : "—"} tone="default" />
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string | number; tone: "default" | "warn" | "danger" }) {
  return (
    <Card
      className={cn(
        "p-3",
        tone === "danger" && "border-rose-500/40 bg-rose-500/5",
        tone === "warn" && "border-amber-500/40 bg-amber-500/5",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums",
          tone === "danger" && "text-rose-700 dark:text-rose-400",
          tone === "warn" && "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </div>
    </Card>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
