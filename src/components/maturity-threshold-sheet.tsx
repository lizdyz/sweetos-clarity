import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const LEVELS = ["L1 Lacking", "L2 Learning", "L3 Launching", "L4 Leveraging", "L5 Leading"] as const;
type Level = (typeof LEVELS)[number];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectKind: "domain" | "tenet" | "component";
  subjectId: string;
  subjectLabel: string;
  relationshipId: string;
  currentLevel: Level | string | null;
}

interface RubricRow {
  id: string;
  level: Level;
  perspective_id: string;
  excellence_definition: string | null;
  checklist_items: string[];
}

interface ProgressRow {
  id: string;
  rubric_id: string;
  checklist_item_index: number;
  checked: boolean;
}

export function MaturityThresholdSheet({
  open,
  onOpenChange,
  subjectKind,
  subjectId,
  subjectLabel,
  relationshipId,
  currentLevel,
}: Props) {
  const qc = useQueryClient();
  const current: Level = (LEVELS.includes(currentLevel as Level) ? (currentLevel as Level) : "L1 Lacking");
  const currentIdx = LEVELS.indexOf(current);
  const next: Level | null = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;

  const { data: rubric = [], isLoading } = useQuery<RubricRow[]>({
    queryKey: ["rubric", subjectKind, subjectId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await sb
        .from("excellence_rubric")
        .select("id, level, perspective_id, excellence_definition, checklist_items")
        .eq("subject_kind", subjectKind)
        .eq("subject_id", subjectId)
        .eq("enabled", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rubricIds = useMemo(() => rubric.map((r) => r.id), [rubric]);

  const { data: progress = [] } = useQuery<ProgressRow[]>({
    queryKey: ["checklist-progress", relationshipId, rubricIds.join(",")],
    enabled: open && rubricIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("excellence_checklist_progress")
        .select("id, rubric_id, checklist_item_index, checked")
        .eq("relationship_id", relationshipId)
        .in("rubric_id", rubricIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ rubricId, idx, next }: { rubricId: string; idx: number; next: boolean }) => {
      const existing = progress.find((p) => p.rubric_id === rubricId && p.checklist_item_index === idx);
      if (existing) {
        const { error } = await sb
          .from("excellence_checklist_progress")
          .update({ checked: next, checked_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("excellence_checklist_progress").insert({
          relationship_id: relationshipId,
          rubric_id: rubricId,
          checklist_item_index: idx,
          checked: next,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-progress", relationshipId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isChecked = (rubricId: string, idx: number) =>
    progress.some((p) => p.rubric_id === rubricId && p.checklist_item_index === idx && p.checked);

  function renderLevelBlock(level: Level, heading: string) {
    const cells = rubric.filter((r) => r.level === level);
    const totalItems = cells.reduce((acc, c) => acc + (c.checklist_items?.length ?? 0), 0);
    const passedItems = cells.reduce(
      (acc, c) => acc + c.checklist_items.filter((_, i) => isChecked(c.id, i)).length,
      0,
    );
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">{heading}</h3>
          <Badge variant={passedItems === totalItems && totalItems > 0 ? "default" : "secondary"} className="text-[10px]">
            {passedItems}/{totalItems} checked
          </Badge>
        </div>
        {cells.length === 0 || totalItems === 0 ? (
          <div className="rounded-md border border-dashed border-border/50 bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
            No checklist items defined for {level}. Add them in Settings → Excellence.
          </div>
        ) : (
          <ul className="space-y-2">
            {cells.flatMap((c) =>
              c.checklist_items.map((item, i) => {
                const id = `${c.id}-${i}`;
                const checked = isChecked(c.id, i);
                return (
                  <li
                    key={id}
                    className="flex items-start gap-2 rounded-md border border-border/40 bg-background p-2 text-xs"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(v) =>
                        toggle.mutate({ rubricId: c.id, idx: i, next: !!v })
                      }
                      className="mt-0.5"
                    />
                    <label htmlFor={id} className="flex-1 cursor-pointer leading-tight">
                      {item}
                    </label>
                  </li>
                );
              }),
            )}
          </ul>
        )}
      </section>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {subjectLabel}
            <Badge variant="secondary" className="text-[10px]">{current}</Badge>
          </SheetTitle>
          <SheetDescription>
            Maturity thresholds for this {subjectKind}. Check items as they're satisfied — the cell auto-advances when all items at the current level pass.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {renderLevelBlock(current, `Current — ${current}`)}
            {next && renderLevelBlock(next, `To advance → ${next}`)}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
