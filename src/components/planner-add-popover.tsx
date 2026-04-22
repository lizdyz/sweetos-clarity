import { useState } from "react";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlannerKind } from "@/components/planner-filter-strip";

interface Props {
  onAdd: (kind: PlannerKind, name: string) => void;
}

const KINDS: { value: PlannerKind; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "project", label: "Project" },
  { value: "campaign", label: "Campaign" },
  { value: "session", label: "Session" },
  { value: "decision", label: "Decision" },
];

/**
 * Smart "+ Add" popover for Planner lanes — default is Task; advanced kinds
 * are one extra click away.
 */
export function PlannerAddPopover({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PlannerKind>("task");
  const [name, setName] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 px-2" title="Add anything">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Add to lane
        </div>
        <Select value={kind} onValueChange={(v) => setKind(v as PlannerKind)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value} className="text-xs">
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            onAdd(kind, n);
            setName("");
            setOpen(false);
          }}
        >
          <Input
            autoFocus
            placeholder={`New ${kind}…`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm" className="mt-2 h-7 w-full text-xs">
            Add {kind}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
