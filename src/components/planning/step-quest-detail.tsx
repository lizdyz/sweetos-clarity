// Step 4 — Quest detail (JTBD · Component · Project · Decision tabs).
// All four kinds attach to the active Quest. We keep linkage simple and
// schema-true:
//   • JTBD            — `jobs_to_be_done` (no quest FK; we tag via notes).
//   • Component       — `components` (no direct quest FK; advanced via
//                        `quests.components_advanced` jsonb array).
//   • Project         — `projects` (no quest FK; we mark via execution_prompt
//                        prefix `[quest:<id>]` so it shows up here even if the
//                        FK is added later).
//   • Decision        — `decisions` (raised_from_kind='quest', raised_from_id).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Target, Layers, FolderKanban, Diamond, ArrowLeft, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityKindHelper } from "@/components/entity-kind-helper";
import { InlineAddRow } from "./inline-add-row";

interface QuestRow {
  id: string;
  name: string;
  components_advanced: unknown;
}

interface JtbdRow {
  id: string;
  statement: string;
  job_type: string;
}

interface ComponentRow {
  id: string;
  name: string;
  current_maturity_level: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  execution_prompt: string | null;
}

interface DecisionRow {
  id: string;
  decision: string;
  status: string | null;
}

interface Props {
  questId: string | null;
  onBack: () => void;
  onNext: () => void;
}

export function StepQuestDetail({ questId, onBack, onNext }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: quest } = useQuery<QuestRow | null>({
    queryKey: ["planning", "quest-detail", questId],
    enabled: !!questId,
    queryFn: async () => {
      if (!questId) return null;
      const { data } = await sb
        .from("quests")
        .select("id, name, components_advanced")
        .eq("id", questId)
        .maybeSingle();
      return (data as QuestRow | null) ?? null;
    },
  });

  // JTBDs (we filter later by source_ref containing the quest id)
  const { data: jtbds = [] } = useQuery<JtbdRow[]>({
    queryKey: ["planning", "jtbds-for-quest", questId],
    enabled: !!questId,
    queryFn: async () => {
      if (!questId) return [];
      const { data, error } = await sb
        .from("jobs_to_be_done")
        .select("id, statement, job_type, source_ref")
        .eq("source_ref", `quest:${questId}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as JtbdRow[];
    },
  });

  // Components advanced by this quest (from jsonb array)
  const advancedIds: string[] = Array.isArray(quest?.components_advanced)
    ? (quest!.components_advanced as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  const { data: components = [] } = useQuery<ComponentRow[]>({
    queryKey: ["planning", "components-for-quest", advancedIds.join(",")],
    enabled: advancedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb
        .from("components")
        .select("id, name, current_maturity_level")
        .in("id", advancedIds);
      if (error) throw error;
      return (data ?? []) as ComponentRow[];
    },
  });

  // Projects tagged to this quest via execution_prompt prefix
  const { data: projects = [] } = useQuery<ProjectRow[]>({
    queryKey: ["planning", "projects-for-quest", questId],
    enabled: !!questId,
    queryFn: async () => {
      if (!questId) return [];
      const { data, error } = await sb
        .from("projects")
        .select("id, name, status, execution_prompt")
        .like("execution_prompt", `[quest:${questId}]%`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
  });

  // Decisions raised from this quest
  const { data: decisions = [] } = useQuery<DecisionRow[]>({
    queryKey: ["planning", "decisions-for-quest", questId],
    enabled: !!questId,
    queryFn: async () => {
      if (!questId) return [];
      const { data, error } = await sb
        .from("decisions")
        .select("id, decision, status")
        .eq("raised_from_kind", "quest")
        .eq("raised_from_id", questId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DecisionRow[];
    },
  });

  // Mutations
  const addJtbd = useMutation({
    mutationFn: async (statement: string) => {
      const { error } = await sb.from("jobs_to_be_done").insert({
        statement,
        job_type: "functional",
        source: "manual",
        source_ref: `quest:${questId}`,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("JTBD added");
      qc.invalidateQueries({ queryKey: ["planning", "jtbds-for-quest", questId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComponent = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await sb
        .from("components")
        .insert({
          name,
          component_kind: "user",
          current_maturity_level: "L1 Lacking",
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Append to quest.components_advanced
      const next = Array.from(new Set([...advancedIds, data.id]));
      const { error: e2 } = await sb
        .from("quests")
        .update({ components_advanced: next })
        .eq("id", questId!);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Component added");
      qc.invalidateQueries({ queryKey: ["planning", "quest-detail", questId] });
      qc.invalidateQueries({ queryKey: ["planning", "components-for-quest"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addProject = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await sb.from("projects").insert({
        name,
        status: "Active",
        execution_prompt: `[quest:${questId}]`,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project added");
      qc.invalidateQueries({ queryKey: ["planning", "projects-for-quest", questId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addDecision = useMutation({
    mutationFn: async (decision: string) => {
      const { error } = await sb.from("decisions").insert({
        decision,
        status: "open",
        raised_from_kind: "quest",
        raised_from_id: questId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision logged");
      qc.invalidateQueries({ queryKey: ["planning", "decisions-for-quest", questId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!questId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        Pick a Quest in Step 3 to flesh it out.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Step 4 · Flesh out</h2>
          <span className="rounded-full bg-iris-soft/60 px-2 py-0.5 text-[11px] font-medium text-[color:var(--iris-violet)]">
            {quest?.name ?? "…"}
          </span>
          <Link
            to="/quests/$id"
            params={{ id: questId }}
            className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Open full Quest →
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Attach the why (JTBDs), the what (Components), the how (Projects),
          and any blockers (Decisions). Add inline; nothing is destructive.
        </p>
      </header>

      <Tabs defaultValue="jtbd">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="jtbd" className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> JTBD ({jtbds.length})
          </TabsTrigger>
          <TabsTrigger value="component" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Components ({components.length})
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" /> Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="decision" className="gap-1.5">
            <Diamond className="h-3.5 w-3.5" /> Decisions ({decisions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jtbd" className="space-y-3">
          <EntityKindHelper kind="jtbd" variant="banner" />
          <DetailList
            items={jtbds.map((j) => ({
              id: j.id,
              label: j.statement,
              meta: j.job_type,
              href: `/library/jtbd/${j.id}`,
            }))}
            empty="No JTBDs captured yet."
          />
          <InlineAddRow
            placeholder="When [context], I want to [motivation], so I can [outcome]."
            onAdd={(v) => addJtbd.mutateAsync(v).then(() => undefined)}
            busy={addJtbd.isPending}
          />
        </TabsContent>

        <TabsContent value="component" className="space-y-3">
          <EntityKindHelper kind="component" variant="banner" />
          <DetailList
            items={components.map((c) => ({
              id: c.id,
              label: c.name,
              meta: c.current_maturity_level ?? "L1",
              href: `/components/${c.id}`,
            }))}
            empty="No Components advanced by this Quest yet."
          />
          <InlineAddRow
            placeholder="e.g. SweetLens panel · Capture queue · Lens Studio"
            onAdd={(v) => addComponent.mutateAsync(v).then(() => undefined)}
            busy={addComponent.isPending}
          />
        </TabsContent>

        <TabsContent value="project" className="space-y-3">
          <EntityKindHelper kind="project" variant="banner" />
          <DetailList
            items={projects.map((p) => ({
              id: p.id,
              label: p.name,
              meta: p.status ?? "—",
              href: `/projects/${p.id}`,
            }))}
            empty="No Projects under this Quest yet."
          />
          <InlineAddRow
            placeholder="e.g. Wave 21 — final wiring · Onboarding revamp Q1"
            onAdd={(v) => addProject.mutateAsync(v).then(() => undefined)}
            busy={addProject.isPending}
          />
        </TabsContent>

        <TabsContent value="decision" className="space-y-3">
          <EntityKindHelper kind="decision" variant="banner" />
          <DetailList
            items={decisions.map((d) => ({
              id: d.id,
              label: d.decision,
              meta: d.status ?? "open",
              href: `/decisions/${d.id}`,
            }))}
            empty="No open Decisions for this Quest. Nice."
          />
          <InlineAddRow
            placeholder="e.g. Should F12 Op-alpha auto-run on Sandbox items?"
            onAdd={(v) => addDecision.mutateAsync(v).then(() => undefined)}
            busy={addDecision.isPending}
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-xl bg-iris px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-glow)]"
        >
          Next: Tasks <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DetailList({
  items,
  empty,
}: {
  items: { id: string; label: string; meta: string; href: string }[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
        {empty}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-background">
      {items.map((it) => (
        <li key={it.id}>
          <Link
            to={it.href}
            className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40"
          >
            <span className="truncate text-sm">{it.label}</span>
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {it.meta}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
