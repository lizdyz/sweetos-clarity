import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { WorkflowFieldMapEditor } from "./workflow-field-map-editor";
import { cn } from "@/lib/utils";

interface Props {
  workflowId: string;
}

interface Binding {
  workflow_id: string;
  execution_kind: string;
  trigger_url: string | null;
  callback_secret: string | null;
  external_id: string | null;
  field_map: Record<string, string>;
  status_map: Record<string, string>;
  last_synced_at: string | null;
  notes: string | null;
}

const KIND_OPTIONS = [
  { value: "native", label: "Native (run in-app)" },
  { value: "n8n", label: "n8n" },
  { value: "make", label: "Make.com" },
  { value: "zapier", label: "Zapier" },
];

const KIND_HELPERS: Record<string, string> = {
  n8n: "In n8n: create a Webhook trigger node, paste its production URL above. Add an HTTP Request node at the end pointing to the callback URL below.",
  make: "In Make: create a Custom Webhook trigger, paste its URL above. Add an HTTP module at the end pointing to the callback URL below.",
  zapier: "In Zapier: use a Webhooks by Zapier trigger, paste its URL above. Add a Webhooks by Zapier action at the end pointing to the callback URL.",
  native: "Native execution runs entirely in this app — no external setup needed.",
};

function generateSecret(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function WorkflowExecutionTab({ workflowId }: Props) {
  const qc = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: binding } = useQuery({
    queryKey: ["workflow_execution_binding", workflowId],
    queryFn: async () => {
      const [{ data: wf }, { data: b }] = await Promise.all([
        supabase
          .from("workflows")
          .select("id, execution_kind")
          .eq("id", workflowId)
          .maybeSingle(),
        supabase
          .from("workflow_execution_bindings")
          .select("*")
          .eq("workflow_id", workflowId)
          .maybeSingle(),
      ]);
      const def: Binding = {
        workflow_id: workflowId,
        execution_kind:
          (b?.execution_kind as string | undefined) ??
          (wf?.execution_kind as string | undefined) ??
          "native",
        trigger_url: b?.trigger_url ?? null,
        callback_secret: b?.callback_secret ?? null,
        external_id: b?.external_id ?? null,
        field_map: (b?.field_map as Record<string, string> | null) ?? {},
        status_map: (b?.status_map as Record<string, string> | null) ?? {},
        last_synced_at: b?.last_synced_at ?? null,
        notes: b?.notes ?? null,
      };
      return def;
    },
  });

  const [form, setForm] = useState<Binding | null>(null);
  useEffect(() => {
    if (binding) setForm(binding);
  }, [binding]);

  if (!form) return null;

  const callbackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/hooks/workflow-callback`;

  function copy(text: string, label: string) {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      // Upsert the binding
      const { error: bErr } = await supabase
        .from("workflow_execution_bindings")
        .upsert(
          {
            workflow_id: workflowId,
            execution_kind: form.execution_kind,
            trigger_url: form.trigger_url,
            callback_secret: form.callback_secret,
            external_id: form.external_id,
            field_map: form.field_map,
            status_map: form.status_map,
            notes: form.notes,
          },
          { onConflict: "workflow_id" },
        );
      if (bErr) throw bErr;

      // Mirror execution_kind onto workflows for fast filtering
      const { error: wErr } = await supabase
        .from("workflows")
        .update({ execution_kind: form.execution_kind })
        .eq("id", workflowId);
      if (wErr) throw wErr;

      toast.success("Execution settings saved");
      qc.invalidateQueries({ queryKey: ["workflow_execution_binding", workflowId] });
      qc.invalidateQueries({ queryKey: ["workflow_execution_chip", workflowId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    if (!form?.trigger_url) {
      toast.error("Set a trigger URL first");
      return;
    }
    setTesting(true);
    try {
      const body = JSON.stringify({
        ping: true,
        lovable_workflow_id: workflowId,
        timestamp: new Date().toISOString(),
      });
      const res = await fetch(form.trigger_url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      if (res.ok) {
        toast.success(`Connected (${res.status})`);
      } else {
        toast.error(`External returned ${res.status}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  const isExternal = form.execution_kind !== "native";
  const helper = KIND_HELPERS[form.execution_kind] ?? "";

  return (
    <section className="panel space-y-5 p-5">
      <div>
        <h2 className="text-sm font-semibold">Execution adapter</h2>
        <p className="text-xs text-muted-foreground">
          Choose where this workflow runs. External adapters use signed webhooks — no SDKs, no embeds.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Execution kind</Label>
          <Select
            value={form.execution_kind}
            onValueChange={(v) => setForm({ ...form, execution_kind: v })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isExternal && (
          <div className="space-y-1.5">
            <Label>External ID (display only)</Label>
            <Input
              value={form.external_id ?? ""}
              onChange={(e) => setForm({ ...form, external_id: e.target.value || null })}
              placeholder="e.g. n8n workflow id or scenario name"
              className="rounded-xl"
            />
          </div>
        )}
      </div>

      {helper && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
          {helper}
        </p>
      )}

      {isExternal && (
        <>
          <div className="space-y-1.5">
            <Label>Trigger URL (we POST here to start a run)</Label>
            <div className="flex gap-2">
              <Input
                value={form.trigger_url ?? ""}
                onChange={(e) => setForm({ ...form, trigger_url: e.target.value || null })}
                placeholder="https://your-n8n.example.com/webhook/abc123"
                className="rounded-xl"
              />
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testing || !form.trigger_url}
                className="shrink-0"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1.5">Test</span>
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Callback URL (paste this into the final step of your external flow)</Label>
            <div className="flex gap-2">
              <code className="flex-1 truncate rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs">
                {callbackUrl}
              </code>
              <Button
                variant="outline"
                onClick={() => copy(callbackUrl, "callback")}
                className="shrink-0"
              >
                {copied === "callback" ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Callback secret (HMAC verification)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={form.callback_secret ?? ""}
                  onChange={(e) => setForm({ ...form, callback_secret: e.target.value || null })}
                  placeholder="Generate or paste a shared secret"
                  className="rounded-xl pr-9 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={() => setForm({ ...form, callback_secret: generateSecret() })}
                className="shrink-0"
              >
                Generate
              </Button>
              <Button
                variant="outline"
                onClick={() => form.callback_secret && copy(form.callback_secret, "secret")}
                disabled={!form.callback_secret}
                className="shrink-0"
              >
                {copied === "secret" ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Send this secret in your callback as <code>x-lovable-signature</code> (HMAC-SHA256 hex of the request body).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Field map — what we send to the external trigger</Label>
            <WorkflowFieldMapEditor
              value={form.field_map}
              onChange={(next) => setForm({ ...form, field_map: next })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
              placeholder="Anything specific about how this external flow works…"
              className="rounded-xl"
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className={cn("text-[11px] text-muted-foreground")}>
          {form.last_synced_at
            ? `Last callback: ${new Date(form.last_synced_at).toLocaleString()}`
            : "No callbacks received yet."}
        </div>
        <Button onClick={save} disabled={saving} className="bg-iris text-white">
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save execution settings"
          )}
        </Button>
      </div>
    </section>
  );
}
