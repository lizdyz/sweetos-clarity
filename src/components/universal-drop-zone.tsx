// UniversalDropZone — drop files, links, text, or an existing entity card.
// Always lands as a `sandbox_items` row in `state='raw'`. Files attach via
// `attached_documents` (uuid[]); links are stored in body with upstream_entity
// metadata; entity drags use upstream_entity jsonb.
//
// Mountable on /sandbox, /today, /capture, and globally inside GlobalAddButton.

import { useCallback, useId, useRef, useState } from "react";
import {
  Link as LinkIcon,
  FileUp,
  Type,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface DropZoneProps {
  /** Hide the heading + description for the compact / popover variant. */
  compact?: boolean;
  className?: string;
  onItemCreated?: (sandboxItemId: string) => void;
}

type Mode = "text" | "link" | "file";

export function UniversalDropZone({ compact, className, onItemCreated }: DropZoneProps) {
  const qc = useQueryClient();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const createText = useMutation({
    mutationFn: async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Empty text");
      const title = trimmed.split("\n")[0].slice(0, 120);
      const { data, error } = await sb
        .from("sandbox_items")
        .insert({
          source_kind: "manual",
          title,
          body: trimmed,
          state: "raw",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setText("");
      setLastCreated(id);
      toast.success("Dropped into Sandbox");
      qc.invalidateQueries({ queryKey: ["sandbox-board"] });
      qc.invalidateQueries({ queryKey: ["sandbox-inbox"] });
      onItemCreated?.(id);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to drop"),
  });

  const createLink = useMutation({
    mutationFn: async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) throw new Error("Empty URL");
      let host = trimmed;
      try {
        host = new URL(trimmed).hostname;
      } catch {
        throw new Error("Not a valid URL");
      }
      const title = `Link · ${host}`;
      const { data, error } = await sb
        .from("sandbox_items")
        .insert({
          source_kind: "manual",
          title,
          body: trimmed,
          state: "raw",
          upstream_entity: { kind: "link", id: null, label: trimmed },
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setLink("");
      setLastCreated(id);
      toast.success("Link dropped into Sandbox");
      qc.invalidateQueries({ queryKey: ["sandbox-board"] });
      qc.invalidateQueries({ queryKey: ["sandbox-inbox"] });
      onItemCreated?.(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createFile = useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) throw new Error("No files");
      const attachmentIds: string[] = [];
      for (const file of arr) {
        const path = `sandbox/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("captures")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: att, error: attErr } = await sb
          .from("capture_attachments")
          .insert({
            storage_path: path,
            original_name: file.name,
            mime_type: file.type || null,
            size_bytes: file.size,
            source: "sandbox_drop",
            entity_table: "sandbox_items",
          })
          .select("id")
          .single();
        if (attErr) throw attErr;
        attachmentIds.push(att.id as string);
      }
      const title =
        arr.length === 1 ? `File · ${arr[0].name}` : `${arr.length} files dropped`;
      const { data, error } = await sb
        .from("sandbox_items")
        .insert({
          source_kind: "manual",
          title,
          body: arr.map((f) => `• ${f.name}`).join("\n"),
          state: "raw",
          attached_documents: attachmentIds,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setLastCreated(id);
      toast.success("Files dropped into Sandbox");
      qc.invalidateQueries({ queryKey: ["sandbox-board"] });
      qc.invalidateQueries({ queryKey: ["sandbox-inbox"] });
      onItemCreated?.(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      // Existing entity drag (set in TriageCard onDragStart elsewhere)
      const entityJson = e.dataTransfer.getData("application/x-sweetbos-entity");
      if (entityJson) {
        try {
          const ent = JSON.parse(entityJson) as { kind: string; id: string; label: string };
          sb.from("sandbox_items")
            .insert({
              source_kind: "manual",
              title: `${ent.kind}: ${ent.label}`,
              body: `Dragged in from ${ent.kind}`,
              state: "raw",
              upstream_entity: ent,
            })
            .select("id")
            .single()
            .then(({ data, error }: { data: { id: string } | null; error: { message: string } | null }) => {
              if (error) {
                toast.error(error.message);
                return;
              }
              if (data) {
                setLastCreated(data.id);
                toast.success(`Linked ${ent.kind} into Sandbox`);
                qc.invalidateQueries({ queryKey: ["sandbox-board"] });
                onItemCreated?.(data.id);
              }
            });
          return;
        } catch {
          // fall through
        }
      }

      // Files
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        createFile.mutate(e.dataTransfer.files);
        return;
      }

      // URL or text
      const url = e.dataTransfer.getData("text/uri-list");
      if (url) {
        createLink.mutate(url);
        return;
      }
      const txt = e.dataTransfer.getData("text/plain");
      if (txt) {
        createText.mutate(txt);
      }
    },
    [createFile, createLink, createText, onItemCreated, qc],
  );

  const busy = createText.isPending || createLink.isPending || createFile.isPending;

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border-2 border-dashed bg-surface/40 p-4 transition-all",
        isDragging
          ? "border-iris bg-iris-soft/40 shadow-[var(--shadow-glow)]"
          : "border-border",
        className,
      )}
    >
      {!compact && (
        <header className="mb-3 flex items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Drop anything here</h3>
            <p className="text-[11px] text-muted-foreground">
              File · link · text · existing card. Lands in Sandbox as a raw idea ready to triage.
            </p>
          </div>
          {lastCreated && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Sent
            </span>
          )}
        </header>
      )}

      <div className="mb-2 inline-flex rounded-lg border border-border bg-background p-0.5 text-xs">
        <ModeBtn current={mode} k="text" set={setMode} icon={<Type className="h-3 w-3" />} label="Text" />
        <ModeBtn current={mode} k="link" set={setMode} icon={<LinkIcon className="h-3 w-3" />} label="Link" />
        <ModeBtn current={mode} k="file" set={setMode} icon={<FileUp className="h-3 w-3" />} label="File" />
      </div>

      {mode === "text" && (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste an idea, observation, quote, half-formed thought…"
            rows={compact ? 2 : 3}
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={busy || !text.trim()}
              onClick={() => createText.mutate(text)}
              className="gap-1.5"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Drop into Sandbox
            </Button>
          </div>
        </div>
      )}

      {mode === "link" && (
        <div className="flex gap-2">
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
          />
          <Button
            size="sm"
            disabled={busy || !link.trim()}
            onClick={() => createLink.mutate(link)}
            className="gap-1.5"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <LinkIcon className="h-3 w-3" />}
            Drop link
          </Button>
        </div>
      )}

      {mode === "file" && (
        <div>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                createFile.mutate(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
            Choose files…
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Or drag files anywhere onto this zone.
          </p>
        </div>
      )}

      {!compact && (
        <p className="mt-3 text-[10px] text-muted-foreground">
          Tip: drag any TriageCard from another page directly onto this zone to link it as upstream provenance.
        </p>
      )}
    </section>
  );
}

function ModeBtn({
  current,
  k,
  set,
  icon,
  label,
}: {
  current: Mode;
  k: Mode;
  set: (m: Mode) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => set(k)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors",
        current === k ? "bg-iris text-white" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
