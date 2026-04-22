import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Sparkles, Mic, MicOff, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { captureProposal } from "@/utils/proposals.functions";
import { supabase } from "@/integrations/supabase/client";
import { FileDrop, type PendingFile } from "@/components/file-drop";
import { TagPicker } from "@/components/tag-picker";
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
  const [last, setLast] = useState<{ entity_type: string; confidence: number; id: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [taggedDomains, setTaggedDomains] = useState<string[]>([]);
  const [taggedTenets, setTaggedTenets] = useState<string[]>([]);
  const [taggedComponents, setTaggedComponents] = useState<string[]>([]);
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
          tagged_domains: taggedDomains,
          tagged_tenets: taggedTenets,
          tagged_components: taggedComponents,
        },
      });
      const p = res.proposal as { id: string; entity_type: string; confidence: number };
      setLast({ id: p.id, entity_type: p.entity_type, confidence: p.confidence });
      setText("");
      setFiles([]);
      setTaggedDomains([]);
      setTaggedTenets([]);
      setTaggedComponents([]);
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
            Type, talk, or drop files. Tag what it's about. Nothing is written until you approve it.
          </p>
        </div>
      </div>

      <Card className="panel-raised space-y-4 p-4">
        <FileDrop files={files} onChange={setFiles} disabled={busy} />

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. New persona — burned-out solo founder in legaltech, 35-50, struggling with client intake..."
          className="min-h-[140px] resize-none border-0 bg-transparent text-[15px] focus-visible:ring-0"
        />

        <div className="grid gap-3 border-t pt-3 sm:grid-cols-3">
          <TagPicker label="Domains" variant="domains" value={taggedDomains} onChange={setTaggedDomains} />
          <TagPicker label="Tenets" variant="tenets" value={taggedTenets} onChange={setTaggedTenets} />
          <TagPicker label="Components" variant="components" value={taggedComponents} onChange={setTaggedComponents} />
        </div>

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
            <div className="mt-1 text-xs text-muted-foreground">
              Review and approve it in the queue before it's written.
            </div>
          </div>
          <Link
            to="/queue"
            className="text-sm font-medium text-[color:var(--iris-violet)] hover:underline"
          >
            Open queue →
          </Link>
        </Card>
      )}

      <Card className="panel-raised mt-4 flex items-start gap-3 p-4 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          Tags help the AI route the proposal and pre-link it to the right Domains, Tenets, and Components.
          Text is extracted from <code className="rounded bg-muted px-1 text-[11px]">.txt</code> /{" "}
          <code className="rounded bg-muted px-1 text-[11px]">.md</code> files; PDFs and images attach but
          aren't parsed yet.
        </p>
      </Card>
    </div>
  );
}
