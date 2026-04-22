import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/session-templates/")({
  component: SessionTemplatesIndex,
});

const SERVICE_TYPES = ["Mirror", "Mirror + Machine", "Machine", "Map"] as const;
const PHASES = ["Seed", "Synthesize", "Session", "Sync", "Ship"] as const;

interface Row {
  id: string;
  name: string;
  service_type: string | null;
  default_duration_minutes: number;
  default_sweetcycle_phase: string | null;
  typical_position_in_journey: number | null;
  enabled: boolean;
}

function SessionTemplatesIndex() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["session_templates_index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_templates" as never)
        .select("id, name, service_type, default_duration_minutes, default_sweetcycle_phase, typical_position_in_journey, enabled")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Session templates</h1>
          <span className="text-sm text-muted-foreground">{rows.length}</span>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New template
        </Button>
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground">
        The catalog of Mirror, Machine, and Map session types — the canonical place where what
        happens in each session is defined. When you schedule a session on a relationship, you pick
        from this list.
      </p>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Duration</th>
              <th className="px-3 py-2 font-medium">Phase</th>
              <th className="px-3 py-2 font-medium">Journey #</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No templates yet. Create one to define a session type.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40 hover:bg-accent/30">
                <td className="px-3 py-2">
                  <Link
                    to="/session-templates/$id"
                    params={{ id: r.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.service_type ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.default_duration_minutes}m</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.default_sweetcycle_phase ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.typical_position_in_journey ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {r.enabled ? (
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                      Enabled
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Disabled
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateTemplateSheet
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["session_templates_index"] });
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTemplateSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState<string>("Mirror");
  const [duration, setDuration] = useState("60");
  const [phase, setPhase] = useState<string>("Session");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        service_type: serviceType,
        default_duration_minutes: Number(duration) || 60,
        default_sweetcycle_phase: phase,
      };
      const { error } = await supabase.from("session_templates" as never).insert(payload as never);
      if (error) throw error;
      toast.success("Template created");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New session template</SheetTitle>
          <SheetDescription>
            Define a reusable session type — like "90-min Mirror Discovery".
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue />
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
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Default phase</Label>
            <Select value={phase} onValueChange={setPhase}>
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
        </div>
        <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Create"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
