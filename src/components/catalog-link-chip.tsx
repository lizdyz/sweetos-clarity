import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Library } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  catalogEntryId?: string | null;
  className?: string;
}

/**
 * Shows that a Document instance points back to a catalog entry in
 * `entity_canon`. Per Wave 6 reconciliation issue #6 — Catalog vs Instance.
 */
export function CatalogLinkChip({ catalogEntryId, className }: Props) {
  const { data } = useQuery({
    queryKey: ["entity-canon", "name", catalogEntryId],
    enabled: Boolean(catalogEntryId),
    queryFn: async () => {
      const { data } = await supabase
        .from("entity_canon")
        .select("id, display_name, entity_kind")
        .eq("id", catalogEntryId!)
        .maybeSingle();
      return data as { id: string; display_name: string; entity_kind: string } | null;
    },
  });
  if (!catalogEntryId) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
        className,
      )}
      title={
        data
          ? `Instance of catalog entry: ${data.display_name} (${data.entity_kind})`
          : "Linked to a Deliverable Catalog entry"
      }
    >
      <Library className="h-3 w-3" />
      <span className="max-w-[10rem] truncate">{data?.display_name ?? "Catalog"}</span>
    </span>
  );
}
