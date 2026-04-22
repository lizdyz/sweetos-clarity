import { useCallback, useRef, useState, type DragEvent } from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PendingFile {
  file: File;
  id: string;
}

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

interface Props {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
  disabled?: boolean;
}

export function FileDrop({ files, onChange, disabled }: Props) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list: PendingFile[] = [...files];
      Array.from(incoming).forEach((f) => {
        if (f.size > MAX_BYTES) return;
        list.push({ file: f, id: crypto.randomUUID() });
      });
      onChange(list);
    },
    [files, onChange],
  );

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHover(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed bg-surface px-4 py-5 text-center text-sm transition-colors",
          hover
            ? "border-[color:var(--iris-violet)] bg-iris-soft/40"
            : "border-border hover:border-[color:var(--iris-violet)]/60 hover:bg-iris-soft/20",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="h-4 w-4 text-muted-foreground" />
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Click to upload</span> or
          drop files here
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          PDF · MD · TXT · images · 25 MB max
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{f.file.name}</span>
              <span className="text-muted-foreground">
                {(f.file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((x) => x.id !== f.id))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
