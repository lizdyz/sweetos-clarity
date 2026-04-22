import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { STATE_OF_THE_THING, SOURCE_OF_ADVANCEMENT } from "@/lib/enums";
import { StateChip } from "@/components/chips";

interface WorkflowState {
  id: string;
  workflow_id: string;
  client_id: string;
  state_of_the_thing: string | null;
  source_of_advancement: string | null;
  notes: string | null;
  updated_at: string;
}

interface RelRef {
  id: string;
  name: string;
}

export function WorkflowStatesPanel({ workflowId }: { workflowId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data: states, isLoading } = useQuery({
    queryKey: ["workflow_states", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_states")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkflowState[];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["relationships", "ref-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationships")
        .select("id, name")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as RelRef[];
    },
  });

  const clientName = (id: string) =>
    clients?.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_states").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow_states", workflowId] });
      toast.success("Removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<WorkflowState> }) => {
      const { error } = await supabase.from("workflow_states").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow_states", workflowId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Per-client state
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="h-7 rounded-lg text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="mr-1 h-3 w-3" /> Add client
        </Button>
      </div>

      {isLoading && (
        <div className="grid place-items-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {!isLoading && (states?.length ?? 0) === 0 && !adding && (
        <p className="py-3 text-xs text-muted-foreground">
          No clients tracked on this workflow yet.
        </p>
      )}

      <ul className="space-y-3">
        {states?.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate font-medium">{clientName(s.client_id)}</span>
              <button
                onClick={() => {
                  if (confirm("Remove this client state?")) del.mutate(s.id);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  State
                </Label>
                <Select
                  value={s.state_of_the_thing ?? undefined}
                  onValueChange={(v) =>
                    update.mutate({ id: s.id, patch: { state_of_the_thing: v } })
                  }
                >
                  <SelectTrigger className="h-8 rounded-lg text-xs">
                    <SelectValue placeholder="State…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATE_OF_THE_THING.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-1.5">
                  <StateChip value={s.state_of_the_thing} />
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Source of advancement
                </Label>
                <Select
                  value={s.source_of_advancement ?? undefined}
                  onValueChange={(v) =>
                    update.mutate({ id: s.id, patch: { source_of_advancement: v } })
                  }
                >
                  <SelectTrigger className="h-8 rounded-lg text-xs">
                    <SelectValue placeholder="Source…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OF_ADVANCEMENT.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  defaultValue={s.notes ?? ""}
                  rows={2}
                  className="rounded-lg text-xs"
                  onBlur={(e) => {
                    if (e.target.value !== (s.notes ?? "")) {
                      update.mutate({ id: s.id, patch: { notes: e.target.value || null } });
                    }
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {adding && (
        <AddStateForm
          workflowId={workflowId}
          clients={clients ?? []}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ["workflow_states", workflowId] });
          }}
        />
      )}
    </section>
  );
}

function AddStateForm({
  workflowId,
  clients,
  onClose,
  onSaved,
}: {
  workflowId: string;
  clients: RelRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [state, setState] = useState<string>("Identified");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!clientId) {
      toast.error("Select a client");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("workflow_states").insert({
      workflow_id: workflowId,
      client_id: clientId,
      state_of_the_thing: state,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Client state added");
    onSaved();
  }

  return (
    <div className="mt-3 rounded-xl border border-iris/30 bg-iris-soft/40 p-3">
      <div className="space-y-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Client
          </Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="h-8 rounded-lg text-xs">
              <SelectValue placeholder="Choose client…" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Initial state
          </Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="h-8 rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATE_OF_THE_THING.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="bg-iris text-white" onClick={save} disabled={busy}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
