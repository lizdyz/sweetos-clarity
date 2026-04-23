import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Mic, MicOff, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { captureProposal } from "@/utils/proposals.functions";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/sb";
import { FileDrop, type PendingFile } from "@/components/file-drop";
import { CaptureQueueStrip } from "@/components/capture-queue-strip";
import { UniversalDropZone } from "@/components/universal-drop-zone";
import { TriageCard } from "@/components/triage-card";
import { useTriagePromote } from "@/lib/use-triage-promote";
import { DEFAULT_PROMOTE_OPTIONS, type Triageable } from "@/lib/triageable";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/capture")({
  component: CapturePage,
});

type Recognition = {
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

const TEXT_EXTRACTABLE = /\.(txt|md|markdown)$/i;

async function extractTextIfPossible(file: File): Promise<string | undefined> {
  if (!TEXT_EXTRACTABLE.test(file.name)) return undefined;
  try {
    return (await file.text()).slice(0, 8000);
  } catch {
    return undefined;
  }
}

function CapturePage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{
    entity_type: string;
    confidence: number;
    id: string;
    suggested_tags?: { domains: string[]; tenets: string[]; components: string[] };
  } | null>(null);
  const [listening, setListening] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const recRef = useRef<Recognition | null>(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const seg = e.results[i];
        if (seg.isFinal) final += seg[0].transcript;
        else interim += seg[0].transcript;
      }
      setText((baseTextRef.current + " " + final + " " + interim).trim());
    };
    r.onerror = (e) => {
      toast.error(`Mic error: ${e.error}`);
      setListening(false);
    };
    r.onend = () => setListening(false);
    recRef.current = r;
  }, []);

  function toggleMic() {
    const r = recRef.current;
    if (!r) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    if (listening) {
      r.stop();
      setListening(false);
    } else {
      baseTextRef.current = text;
      r.start();
      setListening(true);
    }
  }

  async function uploadFiles(): Promise<
    Array<{
      storage_path: string;
      original_name: string;
      mime_type?: string;
      size_bytes?: number;
      extracted_text?: string;
    }>
  > {
    if (files.length === 0) return [];
    const { data: userResp } = await supabase.auth.getUser();
    const uid = userResp.user?.id ?? "anon";
    const out = [];
    for (const f of files) {
      const path = `${uid}/${Date.now()}-${crypto.randomUUID()}-${f.file.name}`;
      const { error } = await supabase.storage
        .from("captures")
        .upload(path, f.file, { contentType: f.file.type, upsert: false });
      if (error) {
        throw new Error(`Upload failed for ${f.file.name}: ${error.message}`);
      }
      const extracted = await extractTextIfPossible(f.file);
      out.push({
        storage_path: path,
        original_name: f.file.name,
        mime_type: f.file.type || undefined,
        size_bytes: f.file.size,
        extracted_text: extracted,
      });
    }
    return out;
  }

  async function submit(source: "capture" | "external_ai") {
    if (text.trim().length < 2 && files.length === 0) return;
    setBusy(true);
    setLast(null);
    try {
      const attachments = await uploadFiles();
      const res = await captureProposal({
        data: {
          text: text.trim() || `Captured ${attachments.length} attachment(s)`,
          source,
          attachments,
        },
      });
      const p = res.proposal as {
        id: string;
        entity_type: string;
        confidence: number;
        tagged_domains?: string[];
        tagged_tenets?: string[];
        tagged_components?: string[];
      };
      setLast({
        id: p.id,
        entity_type: p.entity_type,
        confidence: p.confidence,
        suggested_tags: {
          domains: p.tagged_domains ?? [],
          tenets: p.tagged_tenets ?? [],
          components: p.tagged_components ?? [],
        },
      });

      // Route into SweetScan inbound signals if there's substantive content (file or long text)
      if (text.trim().length > 40 || attachments.length > 0) {
        try {
          await supabase.from("inbound_signals").insert({
            source_kind: attachments.length > 0 ? "screenshot" : "text",
            source_url: null,
            raw_payload: { text: text.trim(), attachments: attachments.map((a) => a.original_name) },
            capture_attachment_id: null,
            summary: text.trim().slice(0, 500),
            status: "pending",
          });
        } catch (e) {
          // Non-fatal — proposal is already staged
          console.warn("inbound_signals insert failed", e);
        }
      }

      setText("");
      setFiles([]);
      baseTextRef.current = "";
      toast.success(`Staged a ${p.entity_type} proposal.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && (text.trim().length >= 2 || files.length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Universal Capture</h1>
          <p className="text-sm text-muted-foreground">
            Type, talk, or drop files. The AI infers the entity, tags, and links — review in the queue.
          </p>
        </div>
      </div>

      <Card className="panel-raised space-y-4 p-4">
        <FileDrop files={files} onChange={setFiles} disabled={busy} />

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. New persona — burned-out solo founder in legaltech, 35-50, struggling with client intake..."
          className="min-h-[160px] resize-none border-0 bg-transparent text-[15px] focus-visible:ring-0"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={listening ? "default" : "outline"}
              size="sm"
              onClick={toggleMic}
              className="gap-1.5"
            >
              {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {listening ? "Stop" : "Talk"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {text.length} chars · {files.length} file{files.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canSubmit}
              onClick={() => submit("external_ai")}
            >
              From another AI
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={() => submit("capture")}
              className="gap-1.5"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Stage proposal
            </Button>
          </div>
        </div>
      </Card>

      {last && (
        <Card className="panel-raised mt-4 flex items-start gap-3 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
          <div className="flex-1">
            <div className="text-sm font-medium">
              Staged a <span className="text-[color:var(--iris-violet)]">{last.entity_type}</span> proposal
              {" "}<span className="text-muted-foreground">· confidence {(last.confidence * 100).toFixed(0)}%</span>
            </div>
            {last.suggested_tags && (last.suggested_tags.domains.length > 0 || last.suggested_tags.tenets.length > 0) && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {last.suggested_tags.domains.map((d) => (
                  <span key={`d-${d}`} className="rounded-md bg-iris-soft px-1.5 py-0.5 text-[10px] font-medium">
                    {d}
                  </span>
                ))}
                {last.suggested_tags.tenets.map((t) => (
                  <span key={`t-${t}`} className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">
              Review and approve it in the queue before it's written.
            </div>
          </div>
          <Link
            to="/capture"
            className="text-sm font-medium text-[color:var(--iris-violet)] hover:underline"
          >
            Refresh queue →
          </Link>
        </Card>
      )}

      <Card className="panel-raised mt-4 flex items-start gap-3 p-4 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          Tags will be inferred — review them in the queue. Text is extracted from{" "}
          <code className="rounded bg-muted px-1 text-[11px]">.txt</code> /{" "}
          <code className="rounded bg-muted px-1 text-[11px]">.md</code> files; PDFs and images attach but
          aren't parsed yet.
        </p>
      </Card>

      <Card className="panel-raised mt-3 flex items-center justify-between gap-3 p-3 text-sm">
        <span className="text-muted-foreground">
          All captures land in your <span className="font-medium text-foreground">Idea Sandbox</span> for triage.
        </span>
        <Link to="/sandbox" className="font-medium text-[color:var(--iris-violet)] hover:underline">
          Open Sandbox →
        </Link>
      </Card>

      <div className="mt-4">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Or drop straight into Sandbox
        </h2>
        <UniversalDropZone />
      </div>

      <CaptureQueueStrip />

      <CaptureProposalsTriageRail />
    </div>
  );
}

function CaptureProposalsTriageRail() {
  const promote = useTriagePromote();
  const { data: proposals = [] } = useQuery({
    queryKey: ["capture", "proposals", "triage"],
    queryFn: async () => {
      const { data } = await sb
        .from("proposals")
        .select("id, entity_type, payload, confidence, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as Array<{
        id: string;
        entity_type: string;
        payload: Record<string, unknown> | null;
        confidence: number | null;
        created_at: string;
      }>;
    },
  });

  if (proposals.length === 0) return null;

  const items: Triageable[] = proposals.map((p) => ({
    id: p.id,
    kind: "sandbox_item",
    title: readPropTitle(p.payload) ?? `(${p.entity_type})`,
    body: typeof p.payload?.description === "string" ? p.payload.description : null,
    source: { kind: "proposal", id: p.id, label: p.entity_type },
    state: "raw",
    frames: [],
    promote_options: DEFAULT_PROMOTE_OPTIONS,
    provenance: { upstream: [], downstream: [] },
    created_at: p.created_at,
    confidence: p.confidence ?? undefined,
    relationship_id: null,
  }));

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Triage — pending proposals
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Frame and promote with the universal gesture
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.id}>
            <TriageCard item={it} onPromote={(item, kind) => promote.mutate({ item, kind })} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function readPropTitle(payload: Record<string, unknown> | null): string | undefined {
  if (!payload) return undefined;
  for (const k of ["name", "title", "campaign_name", "task", "decision"]) {
    const v = payload[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}
