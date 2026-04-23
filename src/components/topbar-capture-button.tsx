import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mic, MicOff, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { sb } from "@/lib/sb";
import { captureProposal } from "@/utils/proposals.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Recognition = {
  start: () => void;
  stop: () => void;
  onresult:
    | ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

/**
 * Plural route segment → entity_canon.entity_kind (singular).
 * Mirrors ENTITY_KEY_TO_CANON_KIND in entity-workspace.tsx.
 */
const SEG_TO_KIND: Record<string, string> = {
  relationships: "relationship",
  projects: "project",
  tasks: "task",
  campaigns: "campaign",
  documents: "document",
  quests: "quest",
  sparks: "spark",
  sessions: "session",
  components: "component",
  personas: "persona",
  playbooks: "playbook",
  decisions: "decision",
  outcomes: "outcome",
  workflows: "workflow",
  operators: "operator",
  missions: "mission",
  journeys: "journey",
  domains: "domain",
  tenets: "tenet",
};

/** Surface-level routes that aren't a single-entity but still benefit from contextual prompts. */
const SURFACE_TO_KIND: Record<string, string> = {
  "/today": "today",
  "/flightdeck": "flightdeck",
  "/sweetcycle": "sweetcycle",
  "/sweetsync": "sweetsync",
  "/sweetscan": "sweetscan",
  "/calendar": "calendar",
  "/planner": "planner",
  "/pipeline": "pipeline",
  "/queue": "queue",
  "/my-tasks": "task",
  "/people": "operator",
  "/vault": "vault",
  "/measures": "measure",
  "/sandbox": "sandbox",
  "/capture": "capture",
};

/** Detect entity kind + id from current pathname. */
function detectContext(pathname: string): { kind: string; id: string | null; label: string } {
  // /<plural>/<id> → entity detail
  const m = pathname.match(/^\/([a-z-]+)\/([0-9a-f-]{36})/i);
  if (m) {
    const seg = m[1];
    const kind = SEG_TO_KIND[seg];
    if (kind) return { kind, id: m[2], label: kind };
  }
  // /<plural> → index
  const idx = pathname.match(/^\/([a-z-]+)$/i);
  if (idx) {
    const seg = idx[1];
    const kind = SEG_TO_KIND[seg];
    if (kind) return { kind, id: null, label: `${kind} list` };
  }
  // operate/library surfaces
  if (SURFACE_TO_KIND[pathname]) {
    return { kind: SURFACE_TO_KIND[pathname], id: null, label: pathname.slice(1) };
  }
  // /library/jtbd, /library/ktis ...
  if (pathname.startsWith("/library/jtbd")) return { kind: "jtbd", id: null, label: "jobs" };
  if (pathname.startsWith("/library/ktis")) return { kind: "kti", id: null, label: "indicators" };
  // fallback — generic capture
  return { kind: "general", id: null, label: "this page" };
}

/**
 * Single, always-visible Capture button mounted in the topbar.
 * Auto-detects the current page's entity kind + id from the URL, reads the canon
 * `capture_prompts`, and stages a proposal pre-scoped to the page subject.
 */
export function TopbarCaptureButton() {
  const location = useLocation();
  const ctx = useMemo(() => detectContext(location.pathname), [location.pathname]);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [staged, setStaged] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const baseTextRef = useRef("");

  const { data: canon } = useQuery({
    queryKey: ["entity_canon", "capture_prompts", ctx.kind],
    queryFn: async () => {
      const { data } = await sb
        .from("entity_canon")
        .select("display_name, capture_prompts")
        .eq("entity_kind", ctx.kind)
        .maybeSingle();
      return (data ?? null) as { display_name: string; capture_prompts: string[] } | null;
    },
    enabled: open,
    staleTime: 5 * 60_000,
  });

  // Init speech recognition once.
  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
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

  // Auto-start mic when popover opens; stop on close.
  useEffect(() => {
    if (!open) {
      const r = recRef.current;
      if (r && listening) r.stop();
      setListening(false);
      setStaged(false);
      return;
    }
    const r = recRef.current;
    if (!r) return;
    baseTextRef.current = text;
    try {
      r.start();
      setListening(true);
    } catch {
      /* already started */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      try {
        r.start();
        setListening(true);
      } catch {
        /* already started */
      }
    }
  }

  async function stage() {
    if (text.trim().length < 2) {
      toast.error("Add a few words first.");
      return;
    }
    setBusy(true);
    const r = recRef.current;
    if (r && listening) r.stop();
    try {
      await captureProposal({
        data: {
          text: text.trim(),
          source: "capture",
          sourceLabel: `topbar:${ctx.kind}${ctx.id ? `:${ctx.id}` : ""}`,
          subjectKind: ctx.kind,
          subjectId: ctx.id ?? undefined,
          sourcePage:
            typeof window !== "undefined" ? window.location.pathname : undefined,
        } as never,
      });
      setStaged(true);
      setText("");
      toast.success(`Captured for ${canon?.display_name ?? ctx.label}`);
      setTimeout(() => setOpen(false), 900);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Capture failed");
    } finally {
      setBusy(false);
    }
  }

  const prompts = canon?.capture_prompts ?? [];
  const niceLabel = canon?.display_name ?? ctx.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-xl border-iris/30 bg-iris-soft/30 text-iris hover:bg-iris-soft/60"
          aria-label={`Capture for ${niceLabel}`}
          title={`Capture for ${niceLabel}`}
        >
          <Mic className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Capture</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] rounded-2xl border-border bg-background/95 p-4 shadow-[var(--shadow-glass)] backdrop-blur-xl"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Capture · {niceLabel}
          </div>
          {staged && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Staged
            </span>
          )}
        </div>

        {prompts.length > 0 && (
          <div className="mb-3 rounded-xl border border-border bg-surface/60 p-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Talking about {niceLabel}? Hit any of these
            </div>
            <ul className="space-y-1 text-[12px] leading-snug text-foreground/85">
              {prompts.map((p, i) => (
                <li key={i} className="flex gap-1.5">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-iris/70" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Speak or type… stream of consciousness is fine."
          rows={4}
          className="resize-none rounded-xl text-sm"
        />

        <div className="mt-3 flex items-center justify-between">
          <Button
            variant={listening ? "default" : "outline"}
            size="sm"
            onClick={toggleMic}
            className={cn(
              "h-9 gap-1.5 rounded-xl",
              listening && "bg-rose-500 text-white hover:bg-rose-600",
            )}
          >
            {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {listening ? "Stop mic" : "Resume mic"}
          </Button>
          <Button
            size="sm"
            onClick={stage}
            disabled={busy || text.trim().length < 2}
            className="h-9 gap-1.5 rounded-xl bg-iris text-white hover:bg-iris/90"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Stop & stage
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
