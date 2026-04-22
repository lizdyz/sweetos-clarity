import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb as supabase } from "@/lib/sb";
import { User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  scope: "client" | "internal" | string | null | undefined;
  relationshipId?: string | null;
  size?: "sm" | "xs";
  asLink?: boolean;
  className?: string;
}

/**
 * ScopeChip — visualizes whether a Spark/Quest is INTERNAL (Liz's own work)
 * or CLIENT (anchored to a specific relationship). Per the canon doc,
 * Sparks/Quests are the SweetSync decomposition path — they must always
 * declare who they're for.
 */
export function ScopeChip({
  scope,
  relationshipId,
  size = "xs",
  asLink = true,
  className,
}: Props) {
  const isClient = scope === "client" && Boolean(relationshipId);

  const { data: rel } = useQuery({
    queryKey: ["relationships", "name", relationshipId],
    enabled: isClient,
    queryFn: async () => {
      const { data } = await supabase
        .from("relationships")
        .select("id, name")
        .eq("id", relationshipId!)
        .maybeSingle();
      return data as { id: string; name: string } | null;
    },
  });

  const sizing =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1"
      : "text-[10px] px-1.5 py-0.5 gap-1";

  if (isClient) {
    const body = (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-[color:var(--iris-violet)]/30 bg-iris-soft/40 font-medium text-[color:var(--iris-violet)]",
          sizing,
          className,
        )}
        title={rel?.name ? `Client: ${rel.name}` : "Client SweetSync"}
      >
        <Users className="h-3 w-3" />
        <span className="max-w-[10rem] truncate">{rel?.name ?? "Client"}</span>
      </span>
    );
    if (asLink && relationshipId) {
      return (
        <Link
          to="/relationships/$id"
          params={{ id: relationshipId }}
          onClick={(e) => e.stopPropagation()}
        >
          {body}
        </Link>
      );
    }
    return body;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted font-medium text-muted-foreground",
        sizing,
        className,
      )}
      title="Internal — Liz's own work"
    >
      <User className="h-3 w-3" />
      Internal
    </span>
  );
}
