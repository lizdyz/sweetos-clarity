// Walk-menu resolver contract.
// Each resolver returns the six edges (verbs) for a given subject in the work graph.
// Edges are lazy-loaded on popover open. Empty arrays render as disabled rows.

import { sb } from "@/lib/sb";

export type WalkKind = "task" | "project" | "workflow_run" | "session";

export type WalkLink = {
  label: string;
  /** Path string compatible with TanStack Link `to` */
  to: string;
  /** Params object for TanStack Link `params`. */
  params?: Record<string, string>;
  hint?: string;
};

export type WalkEdges = {
  up: WalkLink[];        // Parent / container
  down: WalkLink[];      // Children / sub-items
  produces: WalkLink[];  // Outputs / artifacts
  consumes: WalkLink[];  // Inputs / sources
  advances: WalkLink[];  // Goals / measures / quests being moved forward
  about: WalkLink[];     // Detail page / canon
};

const EMPTY: WalkEdges = { up: [], down: [], produces: [], consumes: [], advances: [], about: [] };

export async function resolveWalk(kind: WalkKind, id: string): Promise<WalkEdges> {
  switch (kind) {
    case "task": return resolveTask(id);
    case "project": return resolveProject(id);
    case "workflow_run": return resolveWorkflowRun(id);
    case "session": return resolveSession(id);
    default: return EMPTY;
  }
}

async function resolveTask(id: string): Promise<WalkEdges> {
  const out: WalkEdges = { ...EMPTY, about: [{ label: "Open task", to: "/tasks/$id", params: { id } }] };

  const { data: t } = await sb
    .from("tasks")
    .select("id, name, project_id, proposal_id, source_kind:source, source_ref")
    .eq("id", id)
    .maybeSingle();

  if (t?.project_id) {
    const { data: p } = await sb.from("projects").select("id, name").eq("id", t.project_id).maybeSingle();
    if (p) out.up.push({ label: p.name ?? "Project", to: "/projects/$id", params: { id: p.id }, hint: "Project" });
  }

  // Down — task_dependencies (sub/blocked-by)
  const { data: deps } = await sb
    .from("task_dependencies")
    .select("depends_on_task_id, kind, depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, name)")
    .eq("task_id", id);
  for (const d of deps ?? []) {
    const dep = (d as { depends_on?: { id: string; name: string | null } }).depends_on;
    if (dep) out.down.push({ label: dep.name ?? "Task", to: "/tasks/$id", params: { id: dep.id }, hint: (d as { kind?: string }).kind });
  }

  // Produces — task_components
  const { data: tc } = await sb
    .from("task_components")
    .select("component_id, components(id, name)")
    .eq("task_id", id);
  for (const row of tc ?? []) {
    const c = (row as { components?: { id: string; name: string | null } }).components;
    if (c) out.produces.push({ label: c.name ?? "Component", to: "/components/$id", params: { id: c.id }, hint: "Component" });
  }

  // Consumes — proposal source
  if (t?.proposal_id) {
    out.consumes.push({ label: "Source proposal", to: "/queue", hint: "Proposal" });
  }

  // Advances — measures attached to the project
  if (t?.project_id) {
    const { data: ms } = await sb
      .from("measures")
      .select("id, name")
      .eq("subject_type", "project")
      .eq("subject_id", t.project_id)
      .limit(5);
    for (const m of ms ?? []) {
      out.advances.push({ label: m.name ?? "Measure", to: "/measures", hint: "Measure" });
    }
  }

  return out;
}

async function resolveProject(id: string): Promise<WalkEdges> {
  const out: WalkEdges = { ...EMPTY, about: [{ label: "Open project", to: "/projects/$id", params: { id } }] };

  const { data: p } = await sb
    .from("projects")
    .select("id, name, relationship_id")
    .eq("id", id)
    .maybeSingle();

  if (p?.relationship_id) {
    const { data: r } = await sb.from("relationships").select("id, name").eq("id", p.relationship_id).maybeSingle();
    if (r) out.up.push({ label: r.name ?? "Relationship", to: "/relationships/$id", params: { id: r.id }, hint: "Relationship" });
  }

  const { data: tasks } = await sb
    .from("tasks")
    .select("id, name, status")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(8);
  for (const t of tasks ?? []) {
    out.down.push({ label: t.name ?? "Task", to: "/tasks/$id", params: { id: t.id }, hint: t.status ?? undefined });
  }

  const { data: pc } = await sb
    .from("project_components")
    .select("component_id, components(id, name)")
    .eq("project_id", id);
  for (const row of pc ?? []) {
    const c = (row as { components?: { id: string; name: string | null } }).components;
    if (c) out.produces.push({ label: c.name ?? "Component", to: "/components/$id", params: { id: c.id } });
  }

  return out;
}

async function resolveWorkflowRun(id: string): Promise<WalkEdges> {
  const out: WalkEdges = { ...EMPTY, about: [{ label: "Open run", to: "/workflows/$id/runs/$runId", params: { id, runId: id } }] };

  const { data: run } = await sb
    .from("workflow_runs")
    .select("id, workflow_id, session_id")
    .eq("id", id)
    .maybeSingle();

  if (run?.workflow_id) {
    const { data: w } = await sb.from("workflows").select("id, name").eq("id", run.workflow_id).maybeSingle();
    if (w) out.up.push({ label: w.name ?? "Workflow", to: "/workflows/$id", params: { id: w.id }, hint: "Workflow" });
  }

  const { data: stepRuns } = await sb
    .from("workflow_step_runs")
    .select("id, status, workflow_steps(name)")
    .eq("run_id", id)
    .order("created_at", { ascending: true })
    .limit(20);
  for (const sr of stepRuns ?? []) {
    const name = (sr as { workflow_steps?: { name: string | null } }).workflow_steps?.name ?? "Step";
    out.down.push({ label: name, to: "/workflows/$id/runs/$runId", params: { id: run?.workflow_id ?? "", runId: id }, hint: sr.status });
  }

  if (run?.session_id) {
    out.advances.push({ label: "Session", to: "/sessions/$id", params: { id: run.session_id }, hint: "Session" });
  }

  return out;
}

async function resolveSession(id: string): Promise<WalkEdges> {
  const out: WalkEdges = { ...EMPTY, about: [{ label: "Open session", to: "/sessions/$id", params: { id } }] };

  const { data: s } = await sb
    .from("sessions")
    .select("id, name, engagement_plan_id, session_template_id, sweetcycle_phase")
    .eq("id", id)
    .maybeSingle();

  if (s?.engagement_plan_id) {
    out.up.push({ label: "Engagement plan", to: "/engagement-plans/$id", params: { id: s.engagement_plan_id }, hint: "Plan" });
  }
  if (s?.session_template_id) {
    out.consumes.push({ label: "Template", to: "/session-templates/$id", params: { id: s.session_template_id }, hint: "Template" });
  }
  if (s?.sweetcycle_phase) {
    out.advances.push({ label: `${s.sweetcycle_phase} phase`, to: "/sweetcycle", hint: "SweetCycle" });
  }

  const { data: docs } = await sb
    .from("documents")
    .select("id, name")
    .eq("related_session_id", id)
    .limit(8);
  for (const d of docs ?? []) {
    out.produces.push({ label: d.name ?? "Document", to: "/documents/$id", params: { id: d.id }, hint: "Document" });
  }

  return out;
}
