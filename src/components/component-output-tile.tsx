import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Mail, Newspaper, FileCode, BookOpen, Presentation, GraduationCap, Cog, Layers, FileType2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComponentOutput {
  id: string;
  output_kind: string;
  title: string;
  status: "draft" | "in_review" | "approved" | "published" | "retired";
  visibility: "internal" | "client_shared" | "public";
  body_md: string | null;
  storage_path: string | null;
  version: number;
  generated_by_model: string | null;
  created_at: string;
}

const KIND_ICON: Record<string, typeof Mail> = {
  email: Mail,
  newsletter: Newspaper,
  prd: FileCode,
  one_pager: FileText,
  playbook: BookOpen,
  presentation: Presentation,
  training: GraduationCap,
  workflow_doc: Cog,
  template: Layers,
  spec: FileCode,
  script: FileText,
  other: FileType2,
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  published: "bg-iris-soft text-[color:var(--iris-violet)]",
  retired: "bg-muted text-muted-foreground/60",
};

interface ComponentOutputTileProps {
  output: ComponentOutput;
  onOpen?: () => void;
}

export function ComponentOutputTile({ output, onOpen }: ComponentOutputTileProps) {
  const Icon = KIND_ICON[output.output_kind] ?? FileType2;
  return (
    <Card className="panel-raised flex flex-col gap-2 p-3">
      <div className="flex items-start gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-iris/10 text-[color:var(--iris-violet)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" title={output.title}>
            {output.title}
          </div>
          <div className="text-[10px] text-muted-foreground capitalize">
            {output.output_kind.replace("_", " ")} · v{output.version}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium capitalize", STATUS_TONE[output.status])}>
          {output.status.replace("_", " ")}
        </span>
        {output.visibility !== "internal" && (
          <Badge variant="outline" className="h-4 text-[9px] capitalize">
            {output.visibility.replace("_", " ")}
          </Badge>
        )}
        {output.generated_by_model && (
          <Badge variant="secondary" className="h-4 text-[9px]">
            AI
          </Badge>
        )}
      </div>

      <div className="mt-auto flex justify-end pt-1">
        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onOpen}>
          Open
        </Button>
      </div>
    </Card>
  );
}
