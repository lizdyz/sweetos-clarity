import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Pause,
  Loader2,
  Search,
  Paperclip,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { approveProposal, rejectProposal, holdProposal } from "@/utils/proposals.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/queue")({
  component: QueuePage,
});

interface Attachment {
  id: string;
  storage_path: string;
  original_name: string;
  size_bytes: number | null;
  mime_type: string | null;
}

interface ProposalRow {
  id: string;
  entity_type: string;
  status: string;
  source: string;
  source_label: string | null;
  raw_input: string | null;
  proposed_fields: Record<string, unknown>;
  matched_record_id: string | null;
  matched_record_table: string | null;
  confidence: number | null;
  conflicts: string[];
  ai_model: string | null;
  ai_notes: string | null;
  created_at: string;
  tagged_domains: string[] | null;
  tagged_tenets: string[] | null;
  tagged_components: string[] | null;
  attachments?: Attachment[];
}

const STATUS_FILTERS = ["pending", "held", "approved", "rejected", "merged"] as const;

function QueuePage() {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    const proposals = (data as ProposalRow[] | null) ?? [];

    // Fetch attachments per proposal
    if (proposals.length > 0) {
      const ids = proposals.map((p) => p.id);
      const { data: atts } = await supabase
        .from("capture_attachments")
        .select("id, proposal_id, storage_path, original_name, size_bytes, mime_type")
        .in("proposal_id", ids);
      const byProp: Record<string, Attachment[]> = {};
      (atts ?? []).forEach((a) => {
        const pid = (a as { proposal_id: string }).proposal_id;
        if (!byProp[pid]) byProp[pid] = [];
        byProp[pid].push({
          id: a.id,
          storage_path: a.storage_path,
          original_name: a.original_name,
          size_bytes: a.size_bytes,
          mime_type: a.mime_type,
        });
      });
      proposals.forEach((p) => {
        p.attachments = byProp[p.id] ?? [];
      });
    }
    setRows(proposals);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const hay =
          JSON.stringify(r.proposed_fields).toLowerCase() +
          " " +
          (r.raw_input ?? "").toLowerCase() +
          " " +
          (r.tagged_domains ?? []).join(" ").toLowerCase() +
          " " +
          (r.tagged_tenets ?? []).join(" ").toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const s of STATUS_FILTERS) c[s] = 0;
    rows.forEach((r) => {
      c[r.status] = (c[r.status] ?? 0) + 1;
    });
    return c;
  }, [rows]);

  async function doApprove(p: ProposalRow, merge?: boolean) {
    setBusyId(p.id);
    try {
      await approveProposal({
        data: {
          id: p.id,
          mergeIntoId: merge && p.matched_record_id ? p.matched_record_id : undefined,
        },
      });
      toast.success(merge ? "Merged into existing record" : "Written to database");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doReject(p: ProposalRow) {
    setBusyId(p.id);
    try {
      await rejectProposal({ data: { id: p.id } });
      toast.success("Rejected");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  async function doHold(p: ProposalRow) {
    setBusyId(p.id);
    try {
      await holdProposal({ data: { id: p.id } });
      toast.success("On hold");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hold failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Inbox className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Proposals Queue</h1>
          <p className="text-sm text-muted-foreground">
            Everything captured, pulled, or pasted lives here until you approve it.
          </p>
        </div>
        <Link to="/capture" className="text-sm font-medium text-[color:var(--iris-violet)] hover:underline">
          + Capture
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", ...STATUS_FILTERS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === s
                ? "bg-[color:var(--iris-violet)] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s} {typeof counts[s] === "number" && <span className="opacity-70">· {counts[s]}</span>}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals…"
            className="h-8 w-56 pl-7 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="panel-raised p-10 text-center text-sm text-muted-foreground">
          Nothing here. Head to{" "}
          <Link to="/capture" className="text-[color:var(--iris-violet)] hover:underline">
            Capture
          </Link>{" "}
          to stage something.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProposalCard
              key={p.id}
              p={p}
              busy={busyId === p.id}
              onApprove={() => doApprove(p, false)}
              onMerge={() => doApprove(p, true)}
              onReject={() => doReject(p)}
              onHold={() => doHold(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalCard({
  p,
  busy,
  onApprove,
  onMerge,
  onReject,
  onHold,
}: {
  p: ProposalRow;
  busy: boolean;
  onApprove: () => void;
  onMerge: () => void;
  onReject: () => void;
  onHold: () => void;
}) {
  const fields = (p.proposed_fields ?? {}) as Record<string, unknown>;
  const conf = p.confidence ? Math.round(p.confidence * 100) : null;
  const editable = p.status === "pending" || p.status === "held";
  const domains = p.tagged_domains ?? [];
  const tenets = p.tagged_tenets ?? [];
  const components = p.tagged_components ?? [];
  const attachments = p.attachments ?? [];

  async function downloadAttachment(att: Attachment) {
    const { data, error } = await supabase.storage
      .from("captures")
      .createSignedUrl(att.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Could not generate link");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="panel-raised p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="font-medium uppercase tracking-wider">
          {p.entity_type.replace(/_/g, " ")}
        </Badge>
        <Badge variant="secondary">{p.source}</Badge>
        {conf !== null && (
          <Badge
            variant="outline"
            className={
              conf >= 75
                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                : conf >= 50
                  ? ""
                  : "border-amber-500/40 text-amber-600 dark:text-amber-400"
            }
          >
            {conf}% confidence
          </Badge>
        )}
        <Badge variant={p.status === "pending" ? "default" : "outline"} className="capitalize">
          {p.status}
        </Badge>
        <span className="ml-auto text-muted-foreground">
          {new Date(p.created_at).toLocaleString()}
        </span>
      </div>

      {(domains.length > 0 || tenets.length > 0 || components.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {domains.map((d) => (
            <span
              key={`d-${d}`}
              className="rounded-md bg-iris-soft px-1.5 py-0.5 text-[10px] font-medium text-foreground"
              title="Domain"
            >
              {d}
            </span>
          ))}
          {tenets.map((t) => (
            <span
              key={`t-${t}`}
              className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
              title="Tenet"
            >
              {t}
            </span>
          ))}
          {components.length > 0 && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {components.length} component{components.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-1.5">
        {Object.entries(fields)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .slice(0, 8)
          .map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] gap-3 text-sm">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {k.replace(/_/g, " ")}
              </div>
              <div className="text-foreground">
                {typeof v === "string" ? v : JSON.stringify(v)}
              </div>
            </div>
          ))}
      </div>

      {attachments.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
          </div>
          <ul className="space-y-1">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{a.original_name}</span>
                <button
                  type="button"
                  onClick={() => downloadAttachment(a)}
                  className="inline-flex items-center gap-1 text-[color:var(--iris-violet)] hover:underline"
                >
                  <Download className="h-3 w-3" /> Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.matched_record_id && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          Possible duplicate of an existing {p.matched_record_table?.replace(/s$/, "")}.
          You can merge into it instead of creating a new record.
        </div>
      )}

      {Array.isArray(p.conflicts) && p.conflicts.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
          <div className="font-medium">Conflicts / gaps:</div>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {p.conflicts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {p.raw_input && (
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Original input</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2">{p.raw_input}</pre>
        </details>
      )}

      {editable && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
          <Button size="sm" disabled={busy} onClick={onApprove} className="gap-1.5">
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve & write
          </Button>
          {p.matched_record_id && (
            <Button size="sm" variant="outline" disabled={busy} onClick={onMerge}>
              Merge into existing
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={onHold} className="gap-1.5">
            <Pause className="h-3.5 w-3.5" /> Hold
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={onReject}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
    </Card>
  );
}
