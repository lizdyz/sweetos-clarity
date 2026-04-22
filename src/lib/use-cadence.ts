import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";

export interface CadenceSetting {
  id: string;
  key: string;
  label: string;
  description: string | null;
  value_number: number;
  min_value: number | null;
  max_value: number | null;
  step_value: number | null;
  category: string;
  sort_order: number;
  updated_at: string;
}

export const CADENCE_CATEGORIES = [
  "sparks",
  "quests",
  "journeys",
  "missions",
  "sessions",
  "mirror",
] as const;

export type CadenceCategory = (typeof CADENCE_CATEGORIES)[number];

export const CADENCE_CATEGORY_LABELS: Record<CadenceCategory, string> = {
  sparks: "Sparks",
  quests: "Quests",
  journeys: "Journeys",
  missions: "Missions",
  sessions: "Sessions",
  mirror: "Mirror",
};

export function useCadenceSettings() {
  return useQuery({
    queryKey: ["cadence-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cadence_settings")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CadenceSetting[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns a lookup map { [key]: number } for use anywhere a cadence value is needed.
 * Always returns a value — falls back to 0 if not loaded yet.
 */
export function useCadence(): Record<string, number> {
  const { data } = useCadenceSettings();
  if (!data) return {};
  const map: Record<string, number> = {};
  for (const row of data) map[row.key] = Number(row.value_number);
  return map;
}
