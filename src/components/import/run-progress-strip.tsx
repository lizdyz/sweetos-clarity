import { cn } from "@/lib/utils";

export function RunProgressStrip({
  fileCount, groupCount, schemaCount, objectCount, status,
}: {
  fileCount: number;
  groupCount: number;
  schemaCount: number;
  objectCount: number;
  status: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card/40 px-4 py-2.5 text-sm">
      <Stat label="Files"          value={fileCount} />
      <Sep />
      <Stat label="Groups"         value={groupCount} />
      <Sep />
      <Stat label="Schema gaps"    value={schemaCount} tone={schemaCount > 0 ? "warning" : "muted"} />
      <Sep />
      <Stat label="New object ideas" value={objectCount} tone={objectCount > 0 ? "iris" : "muted"} />
      <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {status}
      </span>
    </div>
  );
}

function Stat({ label, value, tone = "muted" }: { label: string; value: number; tone?: "muted" | "warning" | "iris" }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={cn(
        "text-base font-semibold tabular-nums",
        tone === "warning" && "text-amber-600",
        tone === "iris" && "text-[color:var(--iris-violet)]",
      )}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function Sep() { return <span className="h-3 w-px bg-border" />; }
