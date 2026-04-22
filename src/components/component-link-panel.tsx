import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, X, Component as ComponentIcon } from "lucide-react";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CONTRIBUTION_TYPES = ["Builds", "Refines", "Tests", "Documents", "Retires"] as const;
const MATURITY_LEVELS = [
  "L1 Lacking",
  "L2 Learning",
  "L3 Launching",
  "L4 Leveraging",
  "L5 Leading",
] as const;

interface ProjectComponentRow {
  id: string;
  project_id: string;
  component_id: string;
  contribution_type: string;
  target_maturity_level: string | null;
  target_date: string | null;
}

interface ComponentLinkPanelProps {
  projectId: string;
  className?: string;
}

export function ComponentLinkPanel({ projectId, className }: ComponentLinkPanelProps) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: links = [] } = useQuery({
    queryKey: ["project_components", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_components" as never)
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data ?? []) as unknown as ProjectComponentRow[];
    },
    enabled: !!projectId,
  });

  const componentIds = links.map((l) => l.component_id);
  const { data: components = [] } = useQuery({
    queryKey: ["components_for_links", componentIds.join(",")],
    queryFn: async () => {
      if (componentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("components")
        .select("id, name, current_maturity_level")
        .in("id", componentIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: componentIds.length > 0,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["components_search", search],
    queryFn: async () => {
      let q = supabase.from("components").select("id, name, current_maturity_level").limit(20);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).filter((c) => !componentIds.includes(c.id));
    },
    enabled: pickerOpen,
  });

  const addLink = useMutation({
    mutationFn: async (componentId: string) => {
      const { error } = await supabase
        .from("project_components" as never)
        .insert({ project_id: projectId, component_id: componentId, contribution_type: "Builds" } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project_components", projectId] });
      setSearch("");
      setPickerOpen(false);
      toast.success("Component linked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLink = useMutation({
    mutationFn: async (patch: Partial<ProjectComponentRow> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase
        .from("project_components" as never)
        .update(rest as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_components", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_components" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project_components", projectId] });
      toast.success("Link removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const compById = new Map(components.map((c) => [c.id, c]));

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/50 p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ComponentIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Building / Refining</h3>
          <span className="text-xs text-muted-foreground">{links.length}</span>
        </div>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Link component
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="end">
            <Input
              placeholder="Search components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
            <div className="mt-2 max-h-64 overflow-y-auto">
              {searchResults.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>
              )}
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => addLink.mutate(c.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  <span>{c.name}</span>
                  {c.current_maturity_level && (
                    <span className="text-[10px] text-muted-foreground">{c.current_maturity_level}</span>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No components linked yet. Tie this project to the components it advances.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const c = compById.get(link.component_id);
            return (
              <div
                key={link.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background p-2"
              >
                <Link
                  to="/components/$id"
                  params={{ id: link.component_id }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {c?.name ?? "Component"}
                </Link>
                <Select
                  value={link.contribution_type}
                  onValueChange={(v) => updateLink.mutate({ id: link.id, contribution_type: v })}
                >
                  <SelectTrigger className="h-6 w-24 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRIBUTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={link.target_maturity_level ?? "none"}
                  onValueChange={(v) =>
                    updateLink.mutate({
                      id: link.id,
                      target_maturity_level: v === "none" ? null : v,
                    })
                  }
                >
                  <SelectTrigger className="h-6 w-32 text-[11px]">
                    <SelectValue placeholder="Target level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">No target</SelectItem>
                    {MATURITY_LEVELS.map((l) => (
                      <SelectItem key={l} value={l} className="text-xs">
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={link.target_date ?? ""}
                  onChange={(e) =>
                    updateLink.mutate({ id: link.id, target_date: e.target.value || null })
                  }
                  className="h-6 w-32 text-[11px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6"
                  onClick={() => removeLink.mutate(link.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
