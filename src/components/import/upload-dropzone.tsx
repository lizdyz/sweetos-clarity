import { useCallback, useRef, useState } from "react";
import { CloudUpload, File as FileIcon, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  name: string;
  size: number;
  status: "queued" | "uploading" | "done" | "duplicate" | "failed";
  error?: string;
};

export function UploadDropzone({
  onUpload,
  onAllDone,
  disabled,
}: {
  onUpload: (file: File) => Promise<{ duplicate: boolean }>;
  onAllDone?: () => void;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const initial: Item[] = list.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      size: f.size,
      status: "queued" as const,
    }));
    setItems((prev) => [...prev, ...initial]);

    for (let i = 0; i < list.length; i++) {
      const id = initial[i].id;
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, status: "uploading" } : it));
      try {
        const res = await onUpload(list[i]);
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, status: res.duplicate ? "duplicate" : "done" } : it));
      } catch (e) {
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, status: "failed", error: String(e).slice(0, 120) } : it));
      }
    }
    onAllDone?.();
  }, [onUpload, onAllDone]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) void handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative rounded-3xl border-2 border-dashed bg-card/40 p-12 text-center transition-all",
          dragOver ? "border-iris bg-iris/5 scale-[1.005]" : "border-border/60",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-iris/10 text-[color:var(--iris-violet)]">
          <CloudUpload className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Drop files or a folder to begin</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Markdown, CSV, JSON, plain text. We'll parse, group, and propose where each one belongs.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button onClick={() => inputRef.current?.click()} variant="default">Choose files</Button>
          <span className="text-xs text-muted-foreground">or drag from Finder / Explorer</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".md,.markdown,.csv,.json,.txt,text/markdown,text/csv,application/json,text/plain"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl border bg-card/30">
          <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
            <span>Upload queue · {items.length} files</span>
            <span>
              {items.filter(i => i.status === "done").length} ready ·{" "}
              {items.filter(i => i.status === "duplicate").length} duplicates ·{" "}
              {items.filter(i => i.status === "failed").length} failed
            </span>
          </div>
          <ul className="max-h-72 divide-y overflow-y-auto">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{it.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{(it.size / 1024).toFixed(1)} KB</span>
                <StatusPill status={it.status} error={it.error} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, error }: { status: Item["status"]; error?: string }) {
  if (status === "uploading") return <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Uploading</span>;
  if (status === "done") return <span className="flex items-center gap-1 text-[11px] text-emerald-600"><Check className="h-3 w-3" />Ready</span>;
  if (status === "duplicate") return <span className="text-[11px] text-amber-600">Duplicate · skipped</span>;
  if (status === "failed") return <span title={error} className="flex items-center gap-1 text-[11px] text-rose-600"><AlertCircle className="h-3 w-3" />Failed</span>;
  return <span className="text-[11px] text-muted-foreground">Queued</span>;
}
