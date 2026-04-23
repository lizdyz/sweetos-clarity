import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { listAuditSavedViews, saveAuditView, deleteAuditView } from "@/utils/audit.functions";
import type { AuditFilters } from "@/lib/audit";

export const PRESET_VIEWS: { id: string; name: string; description: string; filters: AuditFilters }[] = [
  {
    id: "preset-operational",
    name: "Operational review",
    description: "Last 7 days, all categories",
    filters: { date_range: "7d" },
  },
  {
    id: "preset-security",
    name: "Security & change visibility",
    description: "Last 30 days · auth, schema, deletes · severity ≥ warning · human",
    filters: {
      date_range: "30d",
      categories: ["auth", "lifecycle", "schema"],
      severities: ["warning", "error", "critical"],
      sources: ["human"],
    },
  },
  {
    id: "preset-compliance",
    name: "Compliance traceability",
    description: "Last 90 days · schema, import, review, prompt, exception",
    filters: {
      date_range: "90d",
      categories: ["schema", "import", "review", "prompt", "exception"],
    },
  },
];

interface Props {
  currentFilters: AuditFilters;
  onApply: (filters: AuditFilters) => void;
}

export function AuditSavedViews({ currentFilters, onApply }: Props) {
  const listFn = useServerFn(listAuditSavedViews);
  const saveFn = useServerFn(saveAuditView);
  const deleteFn = useServerFn(deleteAuditView);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data } = useQuery({
    queryKey: ["audit-saved-views"],
    queryFn: () => listFn(),
  });
  const userViews = (data?.views ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    filters: AuditFilters;
  }>;

  async function handleSave() {
    if (!name.trim()) return;
    const res = await saveFn({ data: { name, description, filters: currentFilters as Record<string, unknown> } });
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("View saved");
      setOpen(false);
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["audit-saved-views"] });
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteFn({ data: { id } });
    if (!res.error) {
      qc.invalidateQueries({ queryKey: ["audit-saved-views"] });
      toast.success("View deleted");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESET_VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onApply(v.filters)}
          title={v.description}
          className="inline-flex items-center gap-1 rounded-full border border-iris/30 bg-iris-soft/30 px-2 py-0.5 text-[10px] font-medium hover:bg-iris-soft/60"
        >
          <Bookmark className="h-2.5 w-2.5" />
          {v.name}
        </button>
      ))}
      {userViews.map((v) => (
        <span
          key={v.id}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px]"
        >
          <button
            type="button"
            onClick={() => onApply(v.filters)}
            title={v.description ?? ""}
            className="font-medium hover:text-iris"
          >
            {v.name}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(v.id)}
            className="text-muted-foreground hover:text-red-500"
            aria-label={`Delete ${v.name}`}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 text-[10px]">
            <Plus className="mr-1 h-3 w-3" />
            Save view
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current filters as a view</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="View name" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
