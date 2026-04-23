import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";

export type MeOperator = {
  id: string;
  name: string;
  kind: "human" | "agent" | "workflow";
  profile_id: string | null;
} | null;

/**
 * Resolves the operator row for the currently logged-in user.
 * Operators link to auth via `profile_id` (= profiles.id = auth.uid()).
 * Returns null if the user has no linked operator (new team member).
 */
export function useMeOperator() {
  const { user } = useAuth();
  return useQuery<MeOperator>({
    queryKey: ["me-operator", user?.id ?? null],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await sb
        .from("operators")
        .select("id, name, kind, profile_id")
        .eq("profile_id", user.id)
        .eq("kind", "human")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as MeOperator;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
}
