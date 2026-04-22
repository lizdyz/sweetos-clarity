import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const STEP_TYPES = ["action", "gate", "branch", "sub_workflow"] as const;
const APPROVAL_ROLES = ["owner", "admin", "any_team_member", "named_operator"] as const;

export interface WorkflowStepRow {
  id: string;
  workflow_id: string;
  position: number;
  name: string;
  description: string | null;
  step_type: string;
  default_operator_id: string | null;
  requires_human_approval: boolean;
  approval_role: string | null;
  tagged_components: string[];
  produces_document_type: string | null;
  expected_duration_minutes: number | null;
  success_criteria: string | null;
}

interface Props {
  step: WorkflowStepRow;
  onClose: () => void;
  onSaved: () => void;
}

export function WorkflowStepSheet({ step, onClose, onSaved }: Props) {
  const [name, setName] = useState(step.name);
  const [description, setDescription] = useState(step.description ?? "");
  const [stepType, setStepType] = useState(step.step_type);
  const [operatorId, setOperatorId] = useState(step.default_operator_id ?? "none");
  const [requiresApproval, setRequiresApproval] = useState(step.requires_human_approval);
  const [approvalRole, setApprovalRole] = useState(step.approval_role ?? "owner");
  const [duration, setDuration] = useState(
    step.expected_duration_minutes ? String(step.expected_duration_minutes) : "",
  );
  const [successCriteria, setSuccessCriteria] = useState(step.success_criteria ?? "");
  const [producesType, setProducesType] = useState(step.produces_document_type ?? "");
  const [busy, setBusy] = useState(false);

  const { data: operators = [] } = useQuery({
    queryKey: ["operators_picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select("id, name, kind")
        .eq("enabled", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; kind: string }>;
    },
  });

  async function save() {
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        step_type: stepType,
        default_operator_id: operatorId === "none" ? null : operatorId,
        requires_human_approval: requiresApproval,
        approval_role: requiresApproval ? approvalRole : null,
        expected_duration_minutes: duration ? Number(duration) : null,
        success_criteria: successCriteria.trim() || null,
        produces_document_type: producesType.trim() || null,
      };
      const { error } = await supabase
        .from("workflow_steps" as never)
        .update(payload as never)
        .eq("id", step.id);
      if (error) throw error;
      toast.success("Step updated");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this step?")) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("workflow_steps" as never)
        .delete()
        .eq("id", step.id);
      if (error) throw error;
      toast.success("Step deleted");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit step</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={stepType} onValueChange={setStepType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expected (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Default operator</Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {operators.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name} <span className="ml-2 text-xs text-muted-foreground">{o.kind}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-3">
            <div>
              <p className="text-sm font-medium">Requires human approval</p>
              <p className="text-xs text-muted-foreground">
                Pause the run until a person confirms.
              </p>
            </div>
            <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
          </div>

          {requiresApproval && (
            <div className="space-y-1.5">
              <Label>Approver role</Label>
              <Select value={approvalRole} onValueChange={setApprovalRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPROVAL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Produces document type</Label>
            <Input
              placeholder="e.g. Mirror Brief"
              value={producesType}
              onChange={(e) => setProducesType(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Success criteria</Label>
            <Textarea
              value={successCriteria}
              onChange={(e) => setSuccessCriteria(e.target.value)}
              rows={2}
              placeholder="What does done look like for this step?"
            />
          </div>
        </div>
        <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-between gap-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
