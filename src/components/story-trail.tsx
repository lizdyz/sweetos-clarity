import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb as supabase } from "@/lib/sb";
import { format } from "date-fns";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Diamond,
  FileText,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StorySubjectKind =
  | "quest"
  | "journey"
  | "component"
  | "relationship"
  | "operator"
  | "workspace";

interface Props {
  subjectKind: StorySubjectKind;
  /** Required for everything except `workspace`. */
  subjectId?: string;
  className?: string;
  /** How many beats to show (default 20). */
  limit?: number;
}

type Beat = {
  id: string;
  kind: "spark" | "output" | "decision" | "audit";
  title: string;
  subtitle?: string | null;
  at: string | null;
  state: "done" | "active" | "locked";
  href?: string;
  badge?: string;
};

/**
 * StoryTrail — chronological narrative of a Quest / Journey / Component /
 * Relationship / Operator, or the whole Workspace (master view).
 * Composes existing data into chapters; never a new table.
 * See `mem://design/story-trail.md`.
 */
export function StoryTrail({ subjectKind, subjectId, className, limit = 20 }: Props) {
  const isWorkspace = subjectKind === "workspace";

  const { data: sparks = [] } = useQuery({
    queryKey: ["story-trail", "sparks", subjectKind, subjectId],
    queryFn: async () => {
      if (subjectKind === "quest" && subjectId) {
        const { data } = await supabase
          .from("sparks")
          .select("id, name, spark_type, progression_state, sequence_order, captured_answer, created_at, done_at, quest_id")
          .eq("quest_id", subjectId)
          .order("sequence_order", { ascending: true });
        return data ?? [];
      }
      if (subjectKind === "operator" && subjectId) {
        const { data } = await supabase
          .from("sparks")
          .select("id, name, spark_type, progression_state, captured_answer, created_at, done_at")
          .eq("generator_operator_id", subjectId)
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      }
      if (isWorkspace) {
        const { data } = await supabase
          .from("sparks")
          .select("id, name, spark_type, progression_state, captured_answer, created_at, done_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      }
      return [];
    },
  });

  const { data: outputs = [] } = useQuery({
    queryKey: ["story-trail", "outputs", subjectKind, subjectId],
    queryFn: async () => {
      if (subjectKind === "component" && subjectId) {
        const { data } = await supabase
          .from("component_outputs")
          .select("id, title, output_kind, status, generated_at, created_at, component_id")
          .eq("component_id", subjectId)
          .order("created_at", { ascending: true });
        return data ?? [];
      }
      if (subjectKind === "relationship" && subjectId) {
        const { data } = await supabase
          .from("component_outputs")
          .select("id, title, output_kind, status, generated_at, created_at, for_relationship_id")
          .eq("for_relationship_id", subjectId)
          .order("created_at", { ascending: true });
        return data ?? [];
      }
      if (subjectKind === "operator" && subjectId) {
        const { data } = await supabase
          .from("component_outputs")
          .select("id, title, output_kind, status, generated_at, created_at")
          .eq("generated_by_operator_id", subjectId)
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      }
      if (isWorkspace) {
        const { data } = await supabase
          .from("component_outputs")
          .select("id, title, output_kind, status, generated_at, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      }
      return [];
    },
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ["story-trail", "decisions", subjectKind, subjectId],
    queryFn: async () => {
      if (subjectKind === "relationship") {
        const { data } = await supabase
          .from("decisions")
          .select("id, decision, context, date_made, created_at, related_project_id")
          .order("created_at", { ascending: true })
          .limit(50);
        return data ?? [];
      }
      if (isWorkspace) {
        const { data } = await supabase
          .from("decisions")
          .select("id, decision, context, date_made, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      }
      return [];
    },
  });

  const { data: audit = [] } = useQuery({
    queryKey: ["story-trail", "audit", subjectKind, subjectId],
    queryFn: async () => {
      if (isWorkspace) {
        const { data } = await supabase
          .from("entity_audit_log")
          .select("id, change_type, field, source, created_at, notes, subject_kind, subject_id")
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      }
      if (subjectKind === "operator" && subjectId) {
        const { data } = await supabase
          .from("entity_audit_log")
          .select("id, change_type, field, source, created_at, notes, subject_kind, subject_id")
          .eq("operator_id", subjectId)
          .order("created_at", { ascending: false })
          .limit(limit);
        return data ?? [];
      }
      if (subjectId) {
        const { data } = await supabase
          .from("entity_audit_log")
          .select("id, change_type, field, source, created_at, notes, subject_kind, subject_id")
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: true })
          .limit(50);
        return data ?? [];
      }
      return [];
    },
  });

  const beats: Beat[] = [
    ...sparks.map((s: any): Beat => ({
      id: `spark-${s.id}`,
      kind: "spark",
      title: s.name,
      subtitle: s.spark_type ?? s.captured_answer ?? null,
      at: s.done_at ?? s.created_at,
      state: s.done_at
        ? "done"
        : s.progression_state === "Active"
          ? "active"
          : s.progression_state === "Locked"
            ? "locked"
            : "active",
      href: `/sparks/${s.id}`,
      badge: s.spark_type ?? undefined,
    })),
    ...outputs.map((o: any): Beat => ({
      id: `output-${o.id}`,
      kind: "output",
      title: o.title,
      subtitle: o.output_kind,
      at: o.generated_at ?? o.created_at,
      state: o.status === "approved" || o.status === "published" ? "done" : "active",
      badge: o.status,
    })),
    ...decisions.map((d: any): Beat => ({
      id: `decision-${d.id}`,
      kind: "decision",
      title: d.decision,
      subtitle: d.context,
      at: d.date_made ?? d.created_at,
      state: "done",
      href: `/decisions/${d.id}`,
    })),
    ...audit
      .filter((a: any) => a.change_type !== "update" || a.notes)
      .slice(0, 12)
      .map((a: any): Beat => ({
        id: `audit-${a.id}`,
        kind: "audit",
        title: a.notes || `${a.change_type}${a.field ? ` · ${a.field}` : ""}`,
        subtitle: a.source,
        at: a.created_at,
        state: "done",
      })),
  ]
    .sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      // Workspace + operator views: most recent first.
      return isWorkspace || subjectKind === "operator" ? tb - ta : ta - tb;
    })
    .slice(0, isWorkspace || subjectKind === "operator" ? limit : undefined);

  const isLoading = !sparks && !outputs && !decisions && !audit;

  const titleText = isWorkspace ? "Master story trail" : "Story trail";

  return (
    <section className={cn("panel-raised p-5", className)}>
      <header className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[color:var(--iris-violet)]" />
        <h2 className="text-sm font-semibold">{titleText}</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {beats.length} {beats.length === 1 ? "chapter" : "chapters"}
        </span>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : beats.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No chapters yet — this story will write itself as work happens here.
        </p>
      ) : (
        <ol className="relative space-y-3 pl-6">
          <span
            aria-hidden
            className="absolute left-[10px] top-1 bottom-1 w-px bg-gradient-to-b from-[color:var(--iris-violet)]/30 via-border to-transparent"
          />
          {beats.map((b) => (
            <BeatRow key={b.id} beat={b} />
          ))}
        </ol>
      )}
    </section>
  );
}

function BeatRow({ beat }: { beat: Beat }) {
  const Icon =
    beat.kind === "decision"
      ? Diamond
      : beat.kind === "output"
        ? FileText
        : beat.state === "done"
          ? CheckCircle2
          : beat.state === "locked"
            ? Lock
            : Circle;

  const tone =
    beat.state === "done"
      ? "text-emerald-500"
      : beat.state === "active"
        ? "text-[color:var(--iris-violet)] animate-pulse"
        : "text-muted-foreground/40";

  const content = (
    <div className="group relative flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-iris-soft/40">
      <span
        className={cn(
          "absolute -left-[18px] grid h-5 w-5 place-items-center rounded-full border bg-background",
          beat.state === "done"
            ? "border-emerald-500/40"
            : beat.state === "active"
              ? "border-[color:var(--iris-violet)]"
              : "border-border",
        )}
      >
        <Icon className={cn("h-3 w-3", tone)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              beat.state === "locked" && "text-muted-foreground",
            )}
          >
            {beat.title}
          </span>
          {beat.badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {beat.badge}
            </span>
          )}
        </div>
        {beat.subtitle && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{beat.subtitle}</p>
        )}
        {beat.at && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {format(new Date(beat.at), "MMM d, yyyy · h:mm a")}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <li>
      {beat.href ? (
        <Link to={beat.href} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}
