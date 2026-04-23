import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Wand2, Layers, Grid3x3, BookOpen, Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { sb } from "@/lib/sb";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  type Lens,
  type LensObjectFit,
  type LensFit,
  type LensOutput,
  ALL_OBJECT_KINDS,
  OBJECT_KIND_LABELS,
  OUTPUT_KIND_LABELS,
} from "@/lib/lens-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings/lens-studio")({
  component: LensStudio,
});

function LensStudio() {
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null);

  const { data: lenses = [], isLoading } = useQuery<Lens[]>({
    queryKey: ["lens-studio", "lenses"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lenses")
        .select("*")
        .order("display_priority", { ascending: false })
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = lenses.find((l) => l.id === selectedLensId) ?? null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        icon={<Wand2 className="h-5 w-5" />}
        title="Lens Studio"
        purpose="Define lenses (BizzyBots + frameworks), what objects they fit, and what outputs they produce. One control surface — replaces the BizzyBots gallery, the lens prompts page, and the lens canon matrix."
        whatYouCanDo={[
          "Browse lenses, edit definitions, personas & prompts",
          "Map lenses to object types (suggested / optional / low-value)",
          "Curate canon and review routed outputs",
        ]}
        connectsTo={[
          { label: "Object Companion (SweetLens)" },
          { label: "Prompt Console", to: "/settings/prompts" },
        ]}
        nextSteps={[
          "Pick a lens in Library → edit Purpose & Persona",
          "Open Object fit → mark which lenses surface for which entities",
          "Review Outputs → see what users have routed to Tasks / Decisions",
        ]}
      />

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="library" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" /> Library
          </TabsTrigger>
          <TabsTrigger value="definition" disabled={!selected} className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Definition
          </TabsTrigger>
          <TabsTrigger value="persona" disabled={!selected} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Persona & prompt
          </TabsTrigger>
          <TabsTrigger value="object-fit" className="gap-1.5">
            <Grid3x3 className="h-3.5 w-3.5" /> Object fit
          </TabsTrigger>
          <TabsTrigger value="outputs" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Outputs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <LibraryTab
            lenses={lenses}
            isLoading={isLoading}
            selectedId={selectedLensId}
            onSelect={setSelectedLensId}
          />
        </TabsContent>

        <TabsContent value="definition">
          {selected && <DefinitionTab lens={selected} />}
        </TabsContent>

        <TabsContent value="persona">
          {selected && <PersonaTab lens={selected} />}
        </TabsContent>

        <TabsContent value="object-fit">
          <ObjectFitTab lenses={lenses} />
        </TabsContent>

        <TabsContent value="outputs">
          <OutputsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Library tab ─────────────────────────────────────────────
function LibraryTab({
  lenses,
  isLoading,
  selectedId,
  onSelect,
}: {
  lenses: Lens[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {lenses.map((lens) => {
        const accent = lens.accent_color || "var(--iris-violet)";
        const isSelected = lens.id === selectedId;
        return (
          <Card
            key={lens.id}
            className={cn(
              "cursor-pointer p-4 transition-all hover:shadow-md",
              isSelected && "ring-2 ring-iris",
              !lens.active && "opacity-60",
            )}
            onClick={() => onSelect(lens.id)}
          >
            <div className="flex items-start gap-3">
              <span
                className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg text-lg"
                style={{ backgroundColor: `${accent}20`, color: accent }}
              >
                {lens.bizzybot_emoji ?? "🔍"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{lens.code}</Badge>
                  <h4 className="truncate font-semibold">{lens.name}</h4>
                  {!lens.active && <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {lens.purpose ?? lens.tagline}
                </p>
                {lens.output_kinds && lens.output_kinds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lens.output_kinds.slice(0, 4).map((k) => (
                      <Badge key={k} variant="secondary" className="text-[9px]">{k}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Definition tab ──────────────────────────────────────────
function DefinitionTab({ lens }: { lens: Lens }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({
    name: lens.name,
    tagline: lens.tagline,
    purpose: lens.purpose ?? "",
    core_intention: lens.core_intention ?? "",
    when_to_use: lens.when_to_use ?? "",
    when_not_to_use: lens.when_not_to_use ?? "",
    display_priority: lens.display_priority ?? 0,
    active: lens.active ?? true,
    output_kinds: (lens.output_kinds ?? []).join(", "),
    stages: (lens.stages ?? []).join(", "),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await sb
        .from("lenses")
        .update({
          name: draft.name,
          tagline: draft.tagline,
          purpose: draft.purpose || null,
          core_intention: draft.core_intention || null,
          when_to_use: draft.when_to_use || null,
          when_not_to_use: draft.when_not_to_use || null,
          display_priority: Number(draft.display_priority) || 0,
          active: draft.active,
          output_kinds: draft.output_kinds.split(",").map((s) => s.trim()).filter(Boolean),
          stages: draft.stages.split(",").map((s) => s.trim()).filter(Boolean),
        })
        .eq("id", lens.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-studio"] });
      qc.invalidateQueries({ queryKey: ["lenses-for-object"] });
      toast.success("Definition saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            {lens.code} · {lens.name}
          </h3>
          <p className="text-xs text-muted-foreground">Edit how this lens is described and surfaced.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="active" className="text-xs">Active</Label>
          <Switch
            id="active"
            checked={draft.active}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Display priority">
          <Input
            type="number"
            value={draft.display_priority}
            onChange={(e) => setDraft({ ...draft, display_priority: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Tagline">
        <Input value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
      </Field>

      <Field label="Purpose" hint="One paragraph: what is this lens for?">
        <Textarea
          rows={2}
          value={draft.purpose}
          onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
        />
      </Field>

      <Field label="Core intention" hint="The one thing this lens uniquely surfaces.">
        <Textarea
          rows={2}
          value={draft.core_intention}
          onChange={(e) => setDraft({ ...draft, core_intention: e.target.value })}
        />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="When to use">
          <Textarea
            rows={3}
            value={draft.when_to_use}
            onChange={(e) => setDraft({ ...draft, when_to_use: e.target.value })}
          />
        </Field>
        <Field label="When NOT to use">
          <Textarea
            rows={3}
            value={draft.when_not_to_use}
            onChange={(e) => setDraft({ ...draft, when_not_to_use: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Stages" hint="Comma-separated, in order.">
        <Input value={draft.stages} onChange={(e) => setDraft({ ...draft, stages: e.target.value })} />
      </Field>

      <Field label="Output kinds" hint="Comma-separated. Drives what the runner offers to route.">
        <Input
          value={draft.output_kinds}
          onChange={(e) => setDraft({ ...draft, output_kinds: e.target.value })}
          placeholder="observation, risk, action, opportunity"
        />
      </Field>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
        {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save definition
      </Button>
    </Card>
  );
}

// ── Persona tab ─────────────────────────────────────────────
function PersonaTab({ lens }: { lens: Lens }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({
    bizzybot_emoji: lens.bizzybot_emoji ?? "",
    accent_color: lens.accent_color ?? "#7c3aed",
    system_prompt: lens.system_prompt ?? "",
    user_prompt_template: lens.user_prompt_template ?? "",
    model: lens.model ?? "google/gemini-2.5-flash",
    kind: lens.kind ?? "framework",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("lenses").update(draft).eq("id", lens.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-studio"] });
      toast.success("Persona saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="text-sm font-semibold">{lens.code} · Persona & AI prompt</h3>
        <p className="text-xs text-muted-foreground">
          Voice, accent, and the AI instructions that run this lens.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Emoji / avatar">
          <Input
            value={draft.bizzybot_emoji}
            onChange={(e) => setDraft({ ...draft, bizzybot_emoji: e.target.value })}
            maxLength={4}
          />
        </Field>
        <Field label="Accent color">
          <Input
            value={draft.accent_color}
            onChange={(e) => setDraft({ ...draft, accent_color: e.target.value })}
          />
        </Field>
        <Field label="Kind">
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as NonNullable<Lens["kind"]> })}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="framework">Framework</option>
            <option value="persona">Persona</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </Field>
      </div>

      <Field label="Model">
        <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
      </Field>

      <Field label="System prompt" hint="Defines voice and methodology of this BizzyBot.">
        <Textarea
          rows={6}
          value={draft.system_prompt}
          onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
        />
      </Field>

      <Field label="User prompt template" hint="Available vars: {{subject_kind}}, {{subject_id}}, {{title}}, {{body}}.">
        <Textarea
          rows={6}
          value={draft.user_prompt_template}
          onChange={(e) => setDraft({ ...draft, user_prompt_template: e.target.value })}
        />
      </Field>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
        {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save persona
      </Button>
    </Card>
  );
}

// ── Object fit tab ──────────────────────────────────────────
function ObjectFitTab({ lenses }: { lenses: Lens[] }) {
  const qc = useQueryClient();
  const { data: fits = [] } = useQuery<LensObjectFit[]>({
    queryKey: ["lens-studio", "fits"],
    queryFn: async () => {
      const { data, error } = await sb.from("lens_object_fit").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const fitMap = new Map<string, LensFit>();
  for (const f of fits) fitMap.set(`${f.lens_id}:${f.object_kind}`, f.fit);

  const setFit = useMutation({
    mutationFn: async ({
      lens_id,
      object_kind,
      fit,
    }: {
      lens_id: string;
      object_kind: string;
      fit: LensFit;
    }) => {
      const existing = fits.find((f) => f.lens_id === lens_id && f.object_kind === object_kind);
      if (existing) {
        const { error } = await sb
          .from("lens_object_fit")
          .update({ fit, priority: fit === "suggested" ? 80 : fit === "optional" ? 40 : 10 })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("lens_object_fit").insert({
          lens_id,
          object_kind,
          fit,
          priority: fit === "suggested" ? 80 : fit === "optional" ? 40 : 10,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-studio", "fits"] });
      qc.invalidateQueries({ queryKey: ["lenses-for-object"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">Object-type recommendations</h3>
        <p className="text-xs text-muted-foreground">
          For each object type, mark which lenses are suggested, optional, or low-value.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/40 p-2 text-left font-semibold">Object kind</th>
              {lenses.map((l) => (
                <th key={l.id} className="p-2 text-center font-semibold" title={l.name}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base">{l.bizzybot_emoji ?? "🔍"}</span>
                    <span className="text-[9px]">{l.code}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_OBJECT_KINDS.map((kind) => (
              <tr key={kind} className="border-t hover:bg-muted/20">
                <td className="sticky left-0 z-10 bg-background p-2 font-medium">
                  {OBJECT_KIND_LABELS[kind]}
                </td>
                {lenses.map((l) => {
                  const fit = fitMap.get(`${l.id}:${kind}`) ?? null;
                  return (
                    <td key={l.id} className="p-1 text-center">
                      <FitCell
                        fit={fit}
                        onChange={(next) =>
                          setFit.mutate({ lens_id: l.id, object_kind: kind, fit: next })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FitCell({
  fit,
  onChange,
}: {
  fit: LensFit | null;
  onChange: (next: LensFit) => void;
}) {
  const cycle: LensFit[] = ["suggested", "optional", "low_value"];
  const next = (curr: LensFit | null): LensFit => {
    const i = curr ? cycle.indexOf(curr) : -1;
    return cycle[(i + 1) % cycle.length];
  };
  const cls =
    fit === "suggested"
      ? "bg-iris/20 text-iris border-iris"
      : fit === "optional"
      ? "bg-muted text-muted-foreground border-border"
      : fit === "low_value"
      ? "bg-muted/30 text-muted-foreground/50 border-dashed border-border"
      : "bg-background text-muted-foreground/30 border-dashed border-border";
  const label = fit === "suggested" ? "★" : fit === "optional" ? "○" : fit === "low_value" ? "·" : "+";
  return (
    <button
      type="button"
      onClick={() => onChange(next(fit))}
      className={cn("h-7 w-7 rounded border text-xs font-bold transition-all hover:scale-110", cls)}
      title={fit ?? "Click to add"}
    >
      {label}
    </button>
  );
}

// ── Outputs tab ─────────────────────────────────────────────
function OutputsTab() {
  const { data: outputs = [], isLoading } = useQuery<LensOutput[]>({
    queryKey: ["lens-studio", "outputs"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lens_outputs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">Recent lens outputs</h3>
        <p className="text-xs text-muted-foreground">
          Everything users have surfaced through lens runs across the system.
        </p>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr>
            <th className="p-2 text-left">Kind</th>
            <th className="p-2 text-left">Title</th>
            <th className="p-2 text-left">Source</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Routed to</th>
            <th className="p-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {outputs.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-muted-foreground">
                No outputs yet. They appear here as users run lenses across the system.
              </td>
            </tr>
          ) : (
            outputs.map((o) => (
              <tr key={o.id} className="border-t hover:bg-muted/20">
                <td className="p-2">
                  <Badge variant="outline" className="text-[10px]">
                    {OUTPUT_KIND_LABELS[o.kind]}
                  </Badge>
                </td>
                <td className="max-w-md p-2">
                  <div className="truncate font-medium">{o.title}</div>
                  {o.body && (
                    <div className="truncate text-[10px] text-muted-foreground">{o.body}</div>
                  )}
                </td>
                <td className="p-2 text-muted-foreground">{o.source_kind}</td>
                <td className="p-2">
                  <Badge
                    variant={o.status === "promoted" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {o.status}
                  </Badge>
                </td>
                <td className="p-2 text-muted-foreground">
                  {o.target_kind ? `${o.target_kind}` : "—"}
                </td>
                <td className="p-2 text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
