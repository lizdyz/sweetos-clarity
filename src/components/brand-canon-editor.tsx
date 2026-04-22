import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { toast } from "sonner";
import { Plus, Sparkles, Save, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ProtagonistAnchorCard, type ProtagonistAnchor } from "./protagonist-anchor-card";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

interface Props {
  relationshipId?: string;
  componentId?: string;
}

interface BrandCanon {
  id: string;
  name: string;
  voice_attributes: {
    tone_words?: string[];
    signature_openers?: string[];
    anti_patterns?: string[];
  };
  visual_style: {
    palette_hex?: string[];
    illustration_style?: string;
    lighting?: string;
    line_weight?: string;
  };
  protagonist_anchors: ProtagonistAnchor[];
  narrative_pillars: string[];
  vault_source_ids: string[];
  forbidden_visuals: string[];
  forbidden_phrases: string[];
  notes: string | null;
}

const empty = (
  relationshipId?: string,
  componentId?: string,
): Partial<BrandCanon> & { relationship_id?: string; component_id?: string } => ({
  name: "",
  voice_attributes: { tone_words: [], signature_openers: [], anti_patterns: [] },
  visual_style: { palette_hex: [], illustration_style: "", lighting: "", line_weight: "" },
  protagonist_anchors: [],
  narrative_pillars: [],
  vault_source_ids: [],
  forbidden_visuals: [],
  forbidden_phrases: [],
  notes: "",
  relationship_id: relationshipId,
  component_id: componentId,
});

function csvToArr(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export function BrandCanonEditor({ relationshipId, componentId }: Props) {
  const qc = useQueryClient();
  const [distillOpen, setDistillOpen] = useState(false);

  const { data: canon, isLoading } = useQuery({
    queryKey: ["narrative_brand_canon", relationshipId ?? null, componentId ?? null],
    queryFn: async () => {
      let q = supabase.from("narrative_brand_canon").select("*").limit(1);
      if (relationshipId) q = q.eq("relationship_id", relationshipId);
      if (componentId) q = q.eq("component_id", componentId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return (data ?? null) as BrandCanon | null;
    },
  });

  const [draft, setDraft] = useState<BrandCanon | (Partial<BrandCanon> & { relationship_id?: string; component_id?: string })>(
    () => empty(relationshipId, componentId),
  );

  useEffect(() => {
    if (canon) {
      setDraft({
        ...canon,
        protagonist_anchors: Array.isArray(canon.protagonist_anchors) ? canon.protagonist_anchors : [],
      });
    } else if (!isLoading) {
      setDraft(empty(relationshipId, componentId));
    }
  }, [canon, isLoading, relationshipId, componentId]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...draft,
        relationship_id: relationshipId ?? null,
        component_id: componentId ?? null,
      };
      if (!payload.name?.trim()) throw new Error("Canon name is required");
      if ((canon as BrandCanon | null)?.id) {
        const { error } = await supabase
          .from("narrative_brand_canon")
          .update(payload)
          .eq("id", (canon as BrandCanon).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("narrative_brand_canon").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Brand Canon saved");
      qc.invalidateQueries({ queryKey: ["narrative_brand_canon"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addAnchor = () => {
    setDraft((d) => ({
      ...d,
      protagonist_anchors: [
        ...(d.protagonist_anchors ?? []),
        { id: crypto.randomUUID(), name: "", description: "", reference_image_url: "" },
      ],
    }));
  };

  const updateAnchor = (next: ProtagonistAnchor) => {
    setDraft((d) => ({
      ...d,
      protagonist_anchors: (d.protagonist_anchors ?? []).map((a) => (a.id === next.id ? next : a)),
    }));
  };

  const removeAnchor = (id: string) => {
    setDraft((d) => ({
      ...d,
      protagonist_anchors: (d.protagonist_anchors ?? []).filter((a) => a.id !== id),
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Brand Canon</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            The fidelity spine for narrative generation. Voice, characters, palette, pillars — what makes outputs recognisably theirs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDistillOpen(true)}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Distill from Vault
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save canon
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="canon-name">Canon name</Label>
          <Input
            id="canon-name"
            value={draft.name ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. Acme Advisory — house voice"
          />
        </div>

        {/* Voice */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Voice</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tone words (comma-separated)</Label>
              <Input
                value={(draft.voice_attributes?.tone_words ?? []).join(", ")}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    voice_attributes: { ...(d.voice_attributes ?? {}), tone_words: csvToArr(e.target.value) },
                  }))
                }
                placeholder="warm-direct, anti-jargon, optimistic-realist"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Signature openers</Label>
              <Input
                value={(draft.voice_attributes?.signature_openers ?? []).join(", ")}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    voice_attributes: { ...(d.voice_attributes ?? {}), signature_openers: csvToArr(e.target.value) },
                  }))
                }
                placeholder="Here's the thing…, Let me show you…"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Anti-patterns (phrases to avoid)</Label>
            <Input
              value={(draft.voice_attributes?.anti_patterns ?? []).join(", ")}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  voice_attributes: { ...(d.voice_attributes ?? {}), anti_patterns: csvToArr(e.target.value) },
                }))
              }
              placeholder="synergy, leverage, at the end of the day"
            />
          </div>
        </section>

        {/* Pillars */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Narrative pillars</h3>
          <Textarea
            value={(draft.narrative_pillars ?? []).join("\n")}
            onChange={(e) =>
              setDraft((d) => ({ ...d, narrative_pillars: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))
            }
            placeholder={"One pillar per line\nExpertise without ego\nThe long game over the loud win\nClarity is kindness"}
            rows={4}
          />
        </section>

        {/* Visual style */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Visual style</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Illustration style</Label>
              <Input
                value={draft.visual_style?.illustration_style ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    visual_style: { ...(d.visual_style ?? {}), illustration_style: e.target.value },
                  }))
                }
                placeholder="editorial flat / watercolour-warm / comic-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lighting</Label>
              <Input
                value={draft.visual_style?.lighting ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    visual_style: { ...(d.visual_style ?? {}), lighting: e.target.value },
                  }))
                }
                placeholder="soft morning, golden-hour, flat ambient"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Line weight</Label>
              <Input
                value={draft.visual_style?.line_weight ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    visual_style: { ...(d.visual_style ?? {}), line_weight: e.target.value },
                  }))
                }
                placeholder="medium, hand-drawn, no outlines"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Palette (comma-separated hex)</Label>
              <Input
                value={(draft.visual_style?.palette_hex ?? []).join(", ")}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    visual_style: { ...(d.visual_style ?? {}), palette_hex: csvToArr(e.target.value) },
                  }))
                }
                placeholder="#0F172A, #F4E4C1, #C2410C"
              />
            </div>
          </div>
          {(draft.visual_style?.palette_hex ?? []).length > 0 ? (
            <div className="flex gap-1.5">
              {(draft.visual_style?.palette_hex ?? []).map((hex, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-md border border-border"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          ) : null}
        </section>

        {/* Protagonist anchors */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Protagonist anchors</h3>
            <Button variant="outline" size="sm" onClick={addAnchor}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add anchor
            </Button>
          </div>
          <div className="space-y-3">
            {(draft.protagonist_anchors ?? []).map((a) => (
              <ProtagonistAnchorCard
                key={a.id}
                anchor={a}
                onChange={updateAnchor}
                onRemove={() => removeAnchor(a.id)}
              />
            ))}
            {(draft.protagonist_anchors ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No anchors yet. Add a recurring character (the founder, the client persona) so illustrations stay consistent.
              </p>
            ) : null}
          </div>
        </section>

        {/* Forbidden */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Forbidden</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Forbidden phrases</Label>
              <Input
                value={(draft.forbidden_phrases ?? []).join(", ")}
                onChange={(e) => setDraft((d) => ({ ...d, forbidden_phrases: csvToArr(e.target.value) }))}
                placeholder="best-in-class, world-class, game-changer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forbidden visuals</Label>
              <Input
                value={(draft.forbidden_visuals ?? []).join(", ")}
                onChange={(e) => setDraft((d) => ({ ...d, forbidden_visuals: csvToArr(e.target.value) }))}
                placeholder="stock-handshake, generic city skyline, laptop hero"
              />
            </div>
          </div>
        </section>

        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={draft.notes ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            rows={2}
            placeholder="Anything else generation should know"
          />
        </div>
      </CardContent>

      <DistillFromVaultDialog
        open={distillOpen}
        onClose={() => setDistillOpen(false)}
        relationshipId={relationshipId}
        componentId={componentId}
        existingCanonId={(canon as BrandCanon | null)?.id}
        onApplied={(proposed) => {
          setDraft((d) => ({
            ...d,
            voice_attributes: { ...(d.voice_attributes ?? {}), ...(proposed.voice_attributes ?? {}) },
            visual_style: { ...(d.visual_style ?? {}), ...(proposed.visual_style ?? {}) },
            narrative_pillars: proposed.narrative_pillars?.length
              ? proposed.narrative_pillars
              : d.narrative_pillars,
            forbidden_phrases: proposed.forbidden_phrases?.length
              ? proposed.forbidden_phrases
              : d.forbidden_phrases,
            forbidden_visuals: proposed.forbidden_visuals?.length
              ? proposed.forbidden_visuals
              : d.forbidden_visuals,
          }));
          toast.success("Proposal merged into draft. Review and Save canon to commit.");
        }}
      />
    </Card>
  );
}

interface DistillProps {
  open: boolean;
  onClose: () => void;
  relationshipId?: string;
  componentId?: string;
  existingCanonId?: string;
  onApplied: (proposed: Partial<BrandCanon>) => void;
}

function DistillFromVaultDialog({
  open,
  onClose,
  relationshipId,
  componentId,
  existingCanonId,
  onApplied,
}: DistillProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [proposal, setProposal] = useState<{ proposed: Partial<BrandCanon>; rationale: string | null } | null>(null);

  const { data: vault = [] } = useQuery({
    queryKey: ["vault-for-distill", relationshipId ?? null, componentId ?? null],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("capture_attachments")
        .select("id, original_name, mime_type, extracted_text, created_at, tagged_relationships, tagged_components")
        .order("created_at", { ascending: false })
        .limit(50);
      if (relationshipId) q = q.contains("tagged_relationships", [relationshipId]);
      if (componentId) q = q.contains("tagged_components", [componentId]);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const run = async () => {
    if (selected.size === 0) {
      toast.error("Pick at least one Vault document");
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabaseClient.functions.invoke("distill-brand-canon", {
        body: {
          relationship_id: relationshipId,
          component_id: componentId,
          brand_canon_id: existingCanonId,
          vault_source_ids: Array.from(selected),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProposal({ proposed: data.proposed ?? {}, rationale: data.rationale ?? null });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Distillation failed");
    } finally {
      setRunning(false);
    }
  };

  const apply = () => {
    if (!proposal) return;
    onApplied(proposal.proposed);
    setProposal(null);
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Distill Brand Canon from Vault</DialogTitle>
        </DialogHeader>

        {!proposal ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick 1–10 documents (mission deck, founder transcript, brand guide, existing case studies). The AI proposes
              voice, pillars, palette, and forbidden lists for your review.
            </p>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto rounded-md border border-border p-2">
              {vault.length === 0 ? (
                <p className="text-sm text-muted-foreground italic p-2">
                  No Vault documents tagged to this subject. Upload or tag some first.
                </p>
              ) : null}
              {vault.map((v: { id: string; original_name: string; mime_type: string | null; extracted_text: string | null }) => (
                <label
                  key={v.id}
                  className="flex items-start gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(v.id)}
                    onCheckedChange={() => toggle(v.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {v.original_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {v.mime_type ?? "unknown"} · {v.extracted_text ? `${v.extracted_text.length} chars extracted` : "no text"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={run} disabled={running || selected.size === 0}>
                {running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                Distill {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {proposal.rationale ? (
              <div className="rounded-md bg-muted/50 p-3 text-sm italic">{proposal.rationale}</div>
            ) : null}
            <pre className="text-xs bg-muted/30 rounded-md p-3 overflow-x-auto max-h-[40vh]">
              {JSON.stringify(proposal.proposed, null, 2)}
            </pre>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setProposal(null)}>Try again</Button>
              <Button onClick={apply}>Merge into draft</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
