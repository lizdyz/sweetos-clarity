import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, BookOpen, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/session-templates/$id")({
  component: SessionTemplateDetail,
});

const SERVICE_TYPES = ["Mirror", "Mirror + Machine", "Machine", "Map"] as const;
const PHASES = ["Seed", "Synthesize", "Session", "Sync", "Ship"] as const;
const PHASE_OWNERS = ["client", "us", "both"] as const;

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  service_type: string | null;
  default_duration_minutes: number;
  default_phase_owner: string | null;
  default_sweetcycle_phase: string | null;
  linked_workflow_id: string | null;
  prep_checklist: string[];
  agenda: string[];
  closing_checklist: string[];
  typical_position_in_journey: number | null;
  enabled: boolean;
}

function SessionTemplateDetail() {
  const { id } = useParams({ from: "/_app/session-templates/$id" });
  const qc = useQueryClient();

  const { data: template } = useQuery({
    queryKey: ["session_template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_templates" as never)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as TemplateRow;
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows_picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const [form, setForm] = useState<Partial<TemplateRow>>({});

  useEffect(() => {
    if (template) setForm(template);
  }, [template]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("session_templates" as never)
        .update(form as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session_template", id] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!template) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-3">
        <Link to="/session-templates" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{template.name}</h1>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          <Save className="mr-1 h-3.5 w-3.5" /> {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Service type</Label>
          <Select
            value={form.service_type ?? ""}
            onValueChange={(v) => setForm((f) => ({ ...f, service_type: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={2}
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <Input
            type="number"
            value={form.default_duration_minutes ?? 60}
            onChange={(e) =>
              setForm((f) => ({ ...f, default_duration_minutes: Number(e.target.value) || 60 }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Typical # in journey</Label>
          <Input
            type="number"
            value={form.typical_position_in_journey ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                typical_position_in_journey: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>Default phase</Label>
          <Select
            value={form.default_sweetcycle_phase ?? ""}
            onValueChange={(v) => setForm((f) => ({ ...f, default_sweetcycle_phase: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default phase owner</Label>
          <Select
            value={form.default_phase_owner ?? ""}
            onValueChange={(v) => setForm((f) => ({ ...f, default_phase_owner: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASE_OWNERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Linked workflow</Label>
          <Select
            value={form.linked_workflow_id ?? "none"}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, linked_workflow_id: v === "none" ? null : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No workflow —</SelectItem>
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <ChecklistEditor
            label="Prep checklist"
            items={form.prep_checklist ?? []}
            onChange={(items) => setForm((f) => ({ ...f, prep_checklist: items }))}
          />
        </div>
        <div className="md:col-span-2">
          <ChecklistEditor
            label="Agenda"
            items={form.agenda ?? []}
            onChange={(items) => setForm((f) => ({ ...f, agenda: items }))}
          />
        </div>
        <div className="md:col-span-2">
          <ChecklistEditor
            label="Closing checklist"
            items={form.closing_checklist ?? []}
            onChange={(items) => setForm((f) => ({ ...f, closing_checklist: items }))}
          />
        </div>

        <div className="flex items-center gap-3 md:col-span-2">
          <Switch
            checked={form.enabled ?? true}
            onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
          />
          <Label>Enabled</Label>
        </div>
      </div>
    </div>
  );
}

function ChecklistEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [newItem, setNewItem] = useState("");
  function add() {
    const v = newItem.trim();
    if (!v) return;
    onChange([...items, v]);
    setNewItem("");
  }
  return (
    <div className="rounded-lg border border-border/40 bg-background p-3">
      <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <ul className="mb-2 space-y-1">
        {items.map((it, idx) => (
          <li
            key={`${idx}-${it}`}
            className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1 text-xs"
          >
            <span className="flex-1">{it}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add item…"
          className="h-7 text-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-7">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
