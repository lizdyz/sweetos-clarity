import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { ComponentOutputTile, type ComponentOutput } from "@/components/component-output-tile";
import { toast } from "sonner";

const OUTPUT_KINDS = [
  { key: "email", label: "Email" },
  { key: "newsletter", label: "Newsletter" },
  { key: "prd", label: "PRD" },
  { key: "one_pager", label: "One-pager" },
  { key: "playbook", label: "Playbook" },
  { key: "spec", label: "Spec" },
  { key: "script", label: "Script" },
  { key: "template", label: "Template" },
  { key: "presentation", label: "Presentation" },
  { key: "workflow_doc", label: "Workflow doc" },
  { key: "training", label: "Training" },
  { key: "other", label: "Other" },
];

interface Props {
  componentId: string;
}

export function ComponentOutputGenerator({ componentId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("email");
  const [title, setTitle] = useState("");
  const [active, setActive] = useState<ComponentOutput | null>(null);

  const { data: outputs = [] } = useQuery<ComponentOutput[]>({
    queryKey: ["component-outputs", componentId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("component_outputs")
        .select(
          "id, output_kind, title, status, visibility, body_md, storage_path, version, generated_by_model, created_at",
        )
        .eq("component_id", componentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ComponentOutput[];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-component-output", {
        body: { component_id: componentId, output_kind: kind, title: title.trim() || undefined },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`Drafted a ${kind.replace("_", " ")}. Review and approve.`);
      setOpen(false);
      setTitle("");
      qc.invalidateQueries({ queryKey: ["component-outputs", componentId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ComponentOutput["status"] }) => {
      const { error } = await sb
        .from("component_outputs")
        .update({ status } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["component-outputs", componentId] });
      if (active) setActive({ ...active, status: "approved" });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <Card className="panel-raised p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Outputs this Component produces</h3>
          <p className="text-[11px] text-muted-foreground">
            Mature Components ship deliverables. Generate a draft, review, approve.
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Generate output
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[420px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[color:var(--iris-violet)]" />
                Generate component output
              </SheetTitle>
            </SheetHeader>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Kind
                </label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OUTPUT_KINDS.map((k) => (
                      <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Title (optional)
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Auto: "{Component name} — ${kind}"`}
                />
              </div>
              <p className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
                The AI will use the matching system prompt (editable in{" "}
                <span className="font-medium">Settings → Prompt Console</span>) plus the Component's
                description, persona context, and questions it answers.
              </p>
              <Button
                className="w-full gap-1.5"
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
              >
                {generate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate draft
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {outputs.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-surface/40 p-6 text-center text-xs text-muted-foreground">
          No outputs yet. Generate the first one to ship this Component as something usable.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {outputs.map((o) => (
            <ComponentOutputTile key={o.id} output={o} onOpen={() => setActive(o)} />
          ))}
        </div>
      )}

      <Sheet open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <SheetContent side="right" className="w-[560px] overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="text-[11px] capitalize text-muted-foreground">
                  {active.output_kind.replace("_", " ")} · v{active.version} · {active.status.replace("_", " ")}
                </div>
                {active.body_md ? (
                  <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-[12px] leading-relaxed">
                    {active.body_md}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">No inline body — file output.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {active.status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: active.id, status: "approved" })}
                      disabled={updateStatus.isPending}
                    >
                      Approve
                    </Button>
                  )}
                  {active.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: active.id, status: "in_review" })}
                    >
                      Send for review
                    </Button>
                  )}
                  {active.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: active.id, status: "published" })}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
