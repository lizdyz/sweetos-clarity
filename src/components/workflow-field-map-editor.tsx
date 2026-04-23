import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ArrowRight } from "lucide-react";

const INTERNAL_FIELDS: Array<{ value: string; label: string }> = [
  { value: "relationship.id", label: "Relationship ID" },
  { value: "relationship.name", label: "Relationship name" },
  { value: "relationship.email", label: "Relationship email" },
  { value: "project.id", label: "Project ID" },
  { value: "project.name", label: "Project name" },
  { value: "trigger.notes", label: "Trigger notes" },
  { value: "run.id", label: "Run ID" },
  { value: "workflow.id", label: "Workflow ID" },
  { value: "workflow.name", label: "Workflow name" },
];

interface Props {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function WorkflowFieldMapEditor({ value, onChange }: Props) {
  const [draftKey, setDraftKey] = useState("");
  const [draftPath, setDraftPath] = useState(INTERNAL_FIELDS[0].value);

  const entries = Object.entries(value ?? {});

  function addRow() {
    const k = draftKey.trim();
    if (!k) return;
    onChange({ ...value, [k]: draftPath });
    setDraftKey("");
  }

  function removeRow(key: string) {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }

  function updateRow(key: string, path: string) {
    onChange({ ...value, [key]: path });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Their input key</span>
        <span />
        <span>Our field</span>
        <span />
      </div>
      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-3 text-xs text-muted-foreground">
          No field mappings yet. Add one below to send data to the external workflow.
        </p>
      )}
      {entries.map(([extKey, intPath]) => (
        <div key={extKey} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
          <code className="truncate rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs">
            {extKey}
          </code>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Select value={intPath} onValueChange={(v) => updateRow(extKey, v)}>
            <SelectTrigger className="h-8 rounded-md text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERNAL_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => removeRow(extKey)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 border-t border-border pt-2">
        <Input
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          placeholder="customer_name"
          className="h-8 rounded-md text-xs"
        />
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Select value={draftPath} onValueChange={setDraftPath}>
          <SelectTrigger className="h-8 rounded-md text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERNAL_FIELDS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" className="h-7 w-7" onClick={addRow} disabled={!draftKey.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
