import { ChevronDown, ChevronRight, FileText, Layers, Target, Wand2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type LineageData = {
  source_path?: string | null;
  filename: string;
  size_bytes?: number | null;
  sha256?: string | null;
  group_label?: string | null;
  group_rationale?: string | null;
  mapping_rationale?: string | null;
  target_table?: string | null;
  target_object_type?: string | null;
  destination_entity_id?: string | null;
};

export function LineageStrip({ data, defaultOpen = false }: { data: LineageData; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-dashed bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>Lineage</span>
      </button>
      {open && (
        <div className="space-y-2 border-t px-3 py-2.5 text-[11px]">
          <Row icon={<FileText className="h-3 w-3" />} label="Source">
            <span className="font-mono">{data.source_path ?? data.filename}</span>
            {data.size_bytes != null && <span className="text-muted-foreground"> · {(data.size_bytes / 1024).toFixed(1)} KB</span>}
            {data.sha256 && <span className="text-muted-foreground font-mono"> · {data.sha256.slice(0, 12)}…</span>}
          </Row>
          <Row icon={<Layers className="h-3 w-3" />} label="Group">
            <span>{data.group_label ?? "—"}</span>
            {data.group_rationale && <div className="text-muted-foreground">Why: {data.group_rationale}</div>}
          </Row>
          <Row icon={<Wand2 className="h-3 w-3" />} label="Mapping">
            <span className="text-muted-foreground">{data.mapping_rationale ?? "—"}</span>
          </Row>
          <Row icon={<Target className="h-3 w-3" />} label="Destination">
            {data.target_table ? (
              <span className="font-mono">{data.target_table}{data.target_object_type ? ` (${data.target_object_type})` : ""}</span>
            ) : <span className="text-muted-foreground">Not yet imported</span>}
            {data.destination_entity_id && <span className="text-muted-foreground"> · {data.destination_entity_id.slice(0, 8)}…</span>}
          </Row>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid grid-cols-[68px_1fr] items-start gap-2")}>
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span>{label}</span></div>
      <div>{children}</div>
    </div>
  );
}
