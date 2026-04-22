import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ListChecks, Folder, Megaphone, Calendar, FileText, Compass, Sparkles } from "lucide-react";

export type PlannerKind = "task" | "project" | "campaign" | "session" | "decision" | "quest";

const KIND_OPTIONS: { value: PlannerKind; label: string; icon: typeof ListChecks }[] = [
  { value: "task", label: "Tasks", icon: ListChecks },
  { value: "project", label: "Projects", icon: Folder },
  { value: "campaign", label: "Campaigns", icon: Megaphone },
  { value: "session", label: "Sessions", icon: Calendar },
  { value: "decision", label: "Decisions", icon: FileText },
  { value: "quest", label: "Quests", icon: Compass },
];

interface Props {
  selected: PlannerKind[];
  onToggle: (kind: PlannerKind) => void;
  mineOnly: boolean;
  onMineOnly: (v: boolean) => void;
}

export function PlannerFilterStrip({ selected, onToggle, mineOnly, onMineOnly }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface/60 p-2">
      <div className="flex items-center gap-1 pl-1 pr-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Sparkles className="h-3 w-3" /> Filter
      </div>
      <button
        type="button"
        onClick={() => onMineOnly(!mineOnly)}
        className={cn(
          "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
          mineOnly
            ? "border-iris/60 bg-iris/10 text-[color:var(--iris-violet)]"
            : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        Mine only
      </button>
      <div className="mx-1 h-4 w-px bg-border/60" />
      {KIND_OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
              on
                ? "border-iris/60 bg-iris/10 text-[color:var(--iris-violet)]"
                : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
      {selected.length > 0 && (
        <Badge variant="outline" className="ml-auto h-5 px-1.5 text-[10px]">
          {selected.length} active
        </Badge>
      )}
    </div>
  );
}
