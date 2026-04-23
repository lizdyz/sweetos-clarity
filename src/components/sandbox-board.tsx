import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox, Sparkles, CheckCircle2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sb } from "@/lib/sb";
import { TriageCard } from "@/components/triage-card";
import { ObjectCompanion } from "@/components/object-companion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type Triageable,
  type Frame,
  type PromoteActionKind,
  DEFAULT_PROMOTE_OPTIONS,
} from "@/lib/triageable";

interface SandboxItemRow {
  id: string;
  source_kind: string;
  source_id: string | null;
  title: string;
  body: string | null;
  state: "raw" | "framed" | "routed" | "archived";
  frames: Frame[];
  relationship_id: string | null;
  routed_to_kind: string | null;
  routed_to_id: string | null;
  routed_at: string | null;
  created_at: string;
  confidence: number | null;
}

interface InboxRow {
  id: string;
  source_kind: string;
  source_id: string | null;
  title: string;
  body: string | null;
  state: string;
  frames: Frame[];
  relationship_id: string | null;
  created_at: string;
}

function rowToTriageable(r: SandboxItemRow): Triageable {
  return {
    id: r.id,
    kind: "sandbox_item",
    title: r.title,
    body: r.body,
    source: { kind: r.source_kind, id: r.source_id, label: r.source_kind },
    state: r.state,
    frames: r.frames ?? [],
    promote_options: DEFAULT_PROMOTE_OPTIONS,
    provenance: { upstream: [], downstream: [] },
    created_at: r.created_at,
    confidence: r.confidence,
    relationship_id: r.relationship_id,
  };
}

function inboxToTriageable(r: InboxRow): Triageable {
  return {
    id: `inbox-${r.source_kind}-${r.source_id ?? r.id}`,
    kind: "sandbox_item",
    title: r.title,
    body: r.body,
    source: { kind: r.source_kind, id: r.source_id, label: r.source_kind },
    state: "raw",
    frames: r.frames ?? [],
    promote_options: DEFAULT_PROMOTE_OPTIONS,
    provenance: { upstream: [], downstream: [] },
    created_at: r.created_at,
    relationship_id: r.relationship_id,
  };
}

export function SandboxBoard() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Triageable | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const { data: items = [], isLoading } = useQuery<SandboxItemRow[]>({
    queryKey: ["sandbox_items"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("sandbox_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: inbox = [] } = useQuery<InboxRow[]>({
    queryKey: ["sandbox_inbox"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("sandbox_inbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).filter((r: InboxRow) => r.source_kind !== "manual");
    },
  });

  const triageables = useMemo(() => {
    const stored = items.map(rowToTriageable);
    const feed = inbox.map(inboxToTriageable);
    return [...stored, ...feed];
  }, [items, inbox]);

  const raw = triageables.filter((t) => t.state === "raw");
  const framed = triageables.filter((t) => t.state === "framed");
  const routed = triageables.filter((t) => t.state === "routed");

  const createDraft = useMutation({
    mutationFn: async () => {
      if (!draftTitle.trim()) throw new Error("Title required");
      const { error } = await sb.from("sandbox_items").insert({
        title: draftTitle.trim(),
        body: draftBody.trim() || null,
        source_kind: "manual",
        state: "raw",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraftTitle("");
      setDraftBody("");
      qc.invalidateQueries({ queryKey: ["sandbox_items"] });
      toast.success("Idea added to Sandbox");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Framework runs now happen inside ObjectCompanion (SweetLens) in the right rail.
  // It writes to lens_perspectives + lens_outputs and supersedes the old `frames` stub.

  const promote = useMutation({
    mutationFn: async ({ target, kind }: { target: Triageable; kind: PromoteActionKind }) => {
      // materialize inbox items first
      let sandboxId = target.id;
      if (target.id.startsWith("inbox-")) {
        const { data, error } = await sb
          .from("sandbox_items")
          .insert({
            title: target.title,
            body: target.body,
            source_kind: target.source.kind,
            source_id: target.source.id,
            relationship_id: target.relationship_id,
            state: "raw",
            frames: target.frames,
          })
          .select()
          .single();
        if (error) throw error;
        sandboxId = (data as SandboxItemRow).id;
      }

      let routedToId: string | null = null;
      if (kind === "task") {
        const { data, error } = await sb
          .from("tasks")
          .insert({
            name: target.title,
            description: target.body,
            status: "To Do",
            priority: "Medium",
            relationship_id: target.relationship_id,
            spawned_by_kind: "sandbox",
            spawned_by_id: sandboxId,
          })
          .select("id")
          .single();
        if (error) throw error;
        routedToId = data.id;
      } else if (kind === "project") {
        const { data, error } = await sb
          .from("projects")
          .insert({
            project_name: target.title,
            client_brief: target.body,
            relationship_id: target.relationship_id,
            status: "Planning",
          })
          .select("id")
          .single();
        if (error) throw error;
        routedToId = data.id;
      } else if (kind === "archive") {
        // no downstream record
      } else if (kind === "spark" || kind === "decision_input" || kind === "component_canon") {
        // v1.5: route to those entities. For now, just log routing.
        toast.info(`Routing to ${kind} — wired in v1.5`);
      }

      const { error: upErr } = await sb
        .from("sandbox_items")
        .update({
          state: kind === "archive" ? "archived" : "routed",
          routed_to_kind: kind,
          routed_to_id: routedToId,
          routed_at: new Date().toISOString(),
        })
        .eq("id", sandboxId);
      if (upErr) throw upErr;
      return { kind, routedToId };
    },
    onSuccess: ({ kind }) => {
      qc.invalidateQueries({ queryKey: ["sandbox_items"] });
      qc.invalidateQueries({ queryKey: ["sandbox_inbox"] });
      toast.success(`Promoted to ${kind}`);
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        {/* Quick capture */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Plus className="h-4 w-4 text-iris" />
            <h3 className="text-sm font-semibold">Drop an idea</h3>
          </div>
          <Input
            placeholder="One-line title…"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="mb-2"
          />
          <Textarea
            placeholder="More context (optional)"
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            rows={2}
            className="mb-2"
          />
          <Button
            size="sm"
            onClick={() => createDraft.mutate()}
            disabled={!draftTitle.trim() || createDraft.isPending}
          >
            {createDraft.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
            Add to Raw
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Lane title="Raw" icon={Inbox} tone="amber" count={raw.length} loading={isLoading}>
            {raw.length === 0 ? (
              <Empty>No untriaged ideas.</Empty>
            ) : (
              raw.map((t) => (
                <TriageCard
                  key={t.id}
                  item={t}
                  selected={selected?.id === t.id}
                  onSelect={setSelected}
                  onPromote={(item, kind) => promote.mutate({ target: item, kind })}
                />
              ))
            )}
          </Lane>

          <Lane title="Framed" icon={Sparkles} tone="iris" count={framed.length}>
            {framed.length === 0 ? (
              <Empty>Run a framework on a Raw idea to move it here.</Empty>
            ) : (
              framed.map((t) => (
                <TriageCard
                  key={t.id}
                  item={t}
                  selected={selected?.id === t.id}
                  onSelect={setSelected}
                  onPromote={(item, kind) => promote.mutate({ target: item, kind })}
                />
              ))
            )}
          </Lane>

          <Lane title="Routed" icon={CheckCircle2} tone="emerald" count={routed.length}>
            {routed.length === 0 ? (
              <Empty>Promoted ideas land here.</Empty>
            ) : (
              routed.map((t) => <TriageCard key={t.id} item={t} />)
            )}
          </Lane>
        </div>
      </div>

      {selected ? (
        <ObjectCompanion
          objectKind="sandbox_item"
          objectId={selected.id}
          objectTitle={selected.title}
          objectBody={selected.body}
        />
      ) : (
        <aside className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-xs text-muted-foreground">
          <div className="text-sm font-semibold text-foreground">SweetLens</div>
          Select an idea to interrogate it with a Lens.
        </aside>
      )}
    </div>
  );
}

function Lane({
  title,
  icon: Icon,
  tone,
  count,
  loading,
  children,
}: {
  title: string;
  icon: typeof Inbox;
  tone: "amber" | "iris" | "emerald";
  count: number;
  loading?: boolean;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "iris"
      ? "text-iris"
      : "text-emerald-700 dark:text-emerald-300";
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-muted/30 p-3">
      <div className="flex items-center justify-between px-1">
        <h3 className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${toneClass}`}>
          <Icon className="h-3.5 w-3.5" />
          {title}
        </h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold">{count}</span>
      </div>
      <div className="flex flex-col gap-2">
        {loading ? <Empty>Loading…</Empty> : children}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-background/50 p-3 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
