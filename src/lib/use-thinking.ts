// Hooks for the Thinking Room — topics + items.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ThinkingTopic = {
  id: string;
  title: string;
  description: string | null;
  journey_id: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type ThinkingItemKind =
  | "canvas"
  | "note"
  | "question"
  | "candidate"
  | "linked"
  | "prompt";

export type CandidateKind =
  | "quest"
  | "project"
  | "decision"
  | "component"
  | "jtbd"
  | "kpi"
  | "task";

export type ThinkingItem = {
  id: string;
  topic_id: string;
  kind: ThinkingItemKind;
  body: string | null;
  candidate_kind: CandidateKind | null;
  promoted_to_kind: string | null;
  promoted_to_id: string | null;
  linked_kind: string | null;
  linked_id: string | null;
  position: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function useThinkingTopics() {
  return useQuery({
    queryKey: ["thinking_topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thinking_topics")
        .select("*")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ThinkingTopic[];
    },
  });
}

export function useThinkingItems(topicId: string | null) {
  return useQuery({
    queryKey: ["thinking_items", topicId],
    enabled: !!topicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thinking_items")
        .select("*")
        .eq("topic_id", topicId!)
        .order("kind", { ascending: true })
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ThinkingItem[];
    },
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; journey_id?: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("thinking_topics")
        .insert({
          title: input.title,
          description: input.description ?? null,
          journey_id: input.journey_id ?? null,
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ThinkingTopic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thinking_topics"] }),
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ThinkingTopic> & { id: string }) => {
      const { data, error } = await supabase
        .from("thinking_topics")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ThinkingTopic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thinking_topics"] }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("thinking_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thinking_topics"] }),
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      topic_id: string;
      kind: ThinkingItemKind;
      body?: string;
      candidate_kind?: CandidateKind | null;
      linked_kind?: string | null;
      linked_id?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("thinking_items")
        .insert({
          topic_id: input.topic_id,
          kind: input.kind,
          body: input.body ?? null,
          candidate_kind: input.candidate_kind ?? null,
          linked_kind: input.linked_kind ?? null,
          linked_id: input.linked_id ?? null,
          metadata: input.metadata ?? {},
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ThinkingItem;
    },
    onSuccess: (item) => qc.invalidateQueries({ queryKey: ["thinking_items", item.topic_id] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, topic_id, ...patch }: Partial<ThinkingItem> & { id: string; topic_id: string }) => {
      const { data, error } = await supabase
        .from("thinking_items")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ThinkingItem;
    },
    onSuccess: (item) => qc.invalidateQueries({ queryKey: ["thinking_items", item.topic_id] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, topic_id }: { id: string; topic_id: string }) => {
      const { error } = await supabase.from("thinking_items").delete().eq("id", id);
      if (error) throw error;
      return topic_id;
    },
    onSuccess: (topic_id) => qc.invalidateQueries({ queryKey: ["thinking_items", topic_id] }),
  });
}
