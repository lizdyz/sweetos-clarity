import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, FileType2, Search, Eye, EyeOff, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VaultFilter {
  personaId?: string;
  componentId?: string;
  relationshipId?: string;
  domain?: string;
  visibility?: "internal" | "client_shared" | "public" | "all";
  source?: "capture" | "session" | "document" | "external_ai" | "manual" | "all";
}

export interface VaultRow {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  visibility: "internal" | "client_shared" | "public";
  source: string;
  tagged_domains: string[];
  tagged_components: string[];
  tagged_personas: string[];
  tagged_relationships: string[];
  extracted_text: string | null;
}

const VIS_META = {
  internal: { label: "Internal", icon: EyeOff, tone: "bg-muted text-muted-foreground" },
  client_shared: { label: "Client", icon: Eye, tone: "bg-iris-soft text-[color:var(--iris-violet)]" },
  public: { label: "Public", icon: Globe, tone: "bg-emerald-100 text-emerald-700" },
} as const;

function fileIcon(mime: string | null) {
  if (!mime) return FileType2;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  return FileType2;
}

function fmtSize(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

interface VaultGridProps {
  initialFilter?: VaultFilter;
  /** Hide filter bar (when embedding in a tab that already has its own filter context). */
  hideFilters?: boolean;
}

export function VaultGrid({ initialFilter = {}, hideFilters = false }: VaultGridProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<VaultFilter>({
    visibility: "all",
    source: "all",
    ...initialFilter,
  });

  const { data: rows = [], isLoading } = useQuery<VaultRow[]>({
    queryKey: ["vault", filter],
    queryFn: async () => {
      let q = sb
        .from("capture_attachments")
        .select(
          "id, storage_path, original_name, mime_type, size_bytes, created_at, visibility, source, tagged_domains, tagged_components, tagged_personas, tagged_relationships, extracted_text",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter.visibility && filter.visibility !== "all") {
        q = q.eq("visibility", filter.visibility);
      }
      if (filter.source && filter.source !== "all") {
        q = q.eq("source", filter.source);
      }
      if (filter.componentId) {
        q = q.contains("tagged_components", [filter.componentId]);
      }
      if (filter.personaId) {
        q = q.contains("tagged_personas", [filter.personaId]);
      }
      if (filter.relationshipId) {
        q = q.contains("tagged_relationships", [filter.relationshipId]);
      }
      if (filter.domain) {
        q = q.contains("tagged_domains", [filter.domain]);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VaultRow[];
    },
  });

  const filtered = search.trim()
    ? rows.filter(
        (r) =>
          r.original_name.toLowerCase().includes(search.toLowerCase()) ||
          (r.extracted_text ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  return (
    <div className="space-y-4">
      {!hideFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or extracted text…"
              className="h-9 pl-8"
            />
          </div>
          <Select
            value={filter.visibility ?? "all"}
            onValueChange={(v) => setFilter((f) => ({ ...f, visibility: v as VaultFilter["visibility"] }))}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="internal">Internal only</SelectItem>
              <SelectItem value="client_shared">Client shared</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filter.source ?? "all"}
            onValueChange={(v) => setFilter((f) => ({ ...f, source: v as VaultFilter["source"] }))}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="capture">Capture</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="external_ai">External AI</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Loading vault…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed bg-surface/40 p-10 text-center text-sm text-muted-foreground">
          No files match. Drop something in <span className="font-medium">Capture</span> to start your Vault.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((row) => {
            const Icon = fileIcon(row.mime_type);
            const vis = VIS_META[row.visibility];
            const VisIcon = vis.icon;
            return (
              <Card key={row.id} className="panel-raised flex flex-col gap-2 p-3">
                <div className="flex items-start gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium" title={row.original_name}>
                      {row.original_name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {fmtSize(row.size_bytes)} · {new Date(row.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium", vis.tone)}>
                    <VisIcon className="h-2.5 w-2.5" />
                    {vis.label}
                  </span>
                  <Badge variant="outline" className="h-4 text-[9px] capitalize">
                    {row.source}
                  </Badge>
                  {row.tagged_domains.slice(0, 2).map((d) => (
                    <Badge key={d} variant="secondary" className="h-4 text-[9px]">
                      {d}
                    </Badge>
                  ))}
                </div>

                <div className="mt-auto flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={async () => {
                      const { data } = await sb.storage
                        .from("captures")
                        .createSignedUrl(row.storage_path, 60 * 5);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    }}
                  >
                    Open
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
