import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComponentChipProps {
  componentId: string;
  className?: string;
}

/**
 * Compact pill that links to a Component, showing its name + journey color.
 * Used by Sparks ("I help build X") and anywhere a Component is referenced inline.
 */
export function ComponentChip({ componentId, className }: ComponentChipProps) {
  const { data } = useQuery({
    queryKey: ["component-chip", componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("components")
        .select("id, name, journey_id")
        .eq("id", componentId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; journey_id: string | null } | null;
    },
  });

  if (!data) return null;

  return (
    <Link
      to="/components/$id"
      params={{ id: componentId }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-iris-soft/40 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-iris-soft hover:underline",
        className,
      )}
      title={`Advances component: ${data.name}`}
    >
      <Layers className="h-3 w-3 text-[color:var(--iris-violet)]" />
      <span className="truncate max-w-[180px]">{data.name}</span>
    </Link>
  );
}
