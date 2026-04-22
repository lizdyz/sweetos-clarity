import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { JTBDCard, type JTBD } from "@/components/jtbd-card";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface JTBDListProps {
  /** Pre-filter by persona */
  personaId?: string;
  /** Pre-filter by component (matches JTBDs whose related_components contains this id) */
  componentId?: string;
  /** Hide the inline create form (use detail page only) */
  hideCreate?: boolean;
}

export function JTBDList({ personaId, componentId, hideCreate = false }: JTBDListProps) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [statement, setStatement] = useState("");
  const [jobType, setJobType] = useState<"functional" | "emotional" | "social">("functional");
  const [outcome, setOutcome] = useState("");

  const { data: items = [], isLoading } = useQuery<JTBD[]>({
    queryKey: ["jtbd", personaId ?? null, componentId ?? null],
    queryFn: async () => {
      let q = sb
        .from("jobs_to_be_done")
        .select(
          "id, statement, job_type, context, desired_outcome, current_solution, pain_severity, status, related_components, related_domains",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (personaId) q = q.eq("persona_id", personaId);
      if (componentId) q = q.contains("related_components", [componentId]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as JTBD[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        statement: statement.trim(),
        job_type: jobType,
        desired_outcome: outcome.trim() || null,
      };
      if (personaId) payload.persona_id = personaId;
      if (componentId) payload.related_components = [componentId];
      const { error } = await sb.from("jobs_to_be_done").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job-to-be-done added.");
      setStatement("");
      setOutcome("");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["jtbd"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-3">
      {!hideCreate && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Jobs-to-be-done <span className="text-muted-foreground">({items.length})</span>
          </h3>
          {!creating ? (
            <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New JTBD
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {creating && (
        <Card className="space-y-2 p-3">
          <Input
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder='When [context], I want to [motivation]…'
            className="h-9 text-sm"
          />
          <Textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="So I can… (desired outcome)"
            className="min-h-[60px] text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <Select value={jobType} onValueChange={(v) => setJobType(v as typeof jobType)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">Functional</SelectItem>
                <SelectItem value="emotional">Emotional</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={statement.trim().length < 5 || create.isPending}
              onClick={() => create.mutate()}
              className="gap-1.5"
            >
              {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed bg-surface/40 p-6 text-center text-sm text-muted-foreground">
          No jobs-to-be-done yet. Capture one to start mapping what your customers are hiring you for.
        </Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((j) => (
            <Link key={j.id} to="/library/jtbd/$id" params={{ id: j.id }} className="block">
              <JTBDCard jtbd={j} compact />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
