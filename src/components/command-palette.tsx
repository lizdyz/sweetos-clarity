import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { SIDEBAR_GROUPS } from "@/components/sidebar-nav";
import {
  Users,
  Bot,
  ListChecks,
  Workflow,
  Layers,
  Sparkles,
  Compass,
  Target,
  type LucideIcon,
} from "lucide-react";

type Hit = {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  to: string;
  params?: Record<string, string>;
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ⌘K command palette. Searches across the most-used entities and lists
 * every sidebar destination. Keep the entity list tight on purpose —
 * we want the palette fast, not exhaustive.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{
    relationships: Hit[];
    operators: Hit[];
    tasks: Hit[];
    projects: Hit[];
    components: Hit[];
    sparks: Hit[];
    quests: Hit[];
  }>({
    relationships: [],
    operators: [],
    tasks: [],
    projects: [],
    components: [],
    sparks: [],
    quests: [],
  });

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setHits({
        relationships: [],
        operators: [],
        tasks: [],
        projects: [],
        components: [],
        sparks: [],
        quests: [],
      });
      return;
    }

    let cancelled = false;
    const like = `%${term}%`;
    const limit = 6;

    (async () => {
      const [rels, ops, ts, ps, cs, sp, qs] = await Promise.all([
        supabase
          .from("relationships")
          .select("id, name, company")
          .or(`name.ilike.${like},company.ilike.${like}`)
          .limit(limit),
        supabase
          .from("operators")
          .select("id, name, kind")
          .ilike("name", like)
          .limit(limit),
        supabase.from("tasks").select("id, name, status").ilike("name", like).limit(limit),
        supabase.from("projects").select("id, name, status").ilike("name", like).limit(limit),
        supabase.from("components").select("id, name, component_kind").ilike("name", like).limit(limit),
        supabase.from("sparks").select("id, name, progression_state").ilike("name", like).limit(limit),
        supabase.from("quests").select("id, name, progression_state").ilike("name", like).limit(limit),
      ]);

      if (cancelled) return;
      setHits({
        relationships: (rels.data ?? []).map((r) => ({
          id: r.id,
          label: r.name ?? "Untitled",
          sublabel: r.company ?? undefined,
          icon: Users,
          to: "/relationships/$id",
          params: { id: r.id },
        })),
        operators: (ops.data ?? []).map((o) => ({
          id: o.id,
          label: o.name ?? "Operator",
          sublabel: o.kind ?? undefined,
          icon: Bot,
          to: "/operators/$id",
          params: { id: o.id },
        })),
        tasks: (ts.data ?? []).map((t) => ({
          id: t.id,
          label: t.name ?? "Task",
          sublabel: t.status ?? undefined,
          icon: ListChecks,
          to: "/tasks/$id",
          params: { id: t.id },
        })),
        projects: (ps.data ?? []).map((p) => ({
          id: p.id,
          label: p.name ?? "Project",
          sublabel: p.status ?? undefined,
          icon: Workflow,
          to: "/projects/$id",
          params: { id: p.id },
        })),
        components: (cs.data ?? []).map((c) => ({
          id: c.id,
          label: c.name ?? "Component",
          sublabel: c.component_kind ?? undefined,
          icon: Layers,
          to: "/components/$id",
          params: { id: c.id },
        })),
        sparks: (sp.data ?? []).map((s) => ({
          id: s.id,
          label: s.name ?? "Spark",
          sublabel: s.progression_state ?? undefined,
          icon: Sparkles,
          to: "/sparks/$id",
          params: { id: s.id },
        })),
        quests: (qs.data ?? []).map((q) => ({
          id: q.id,
          label: q.name ?? "Quest",
          sublabel: q.progression_state ?? undefined,
          icon: Compass,
          to: "/quests/$id",
          params: { id: q.id },
        })),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [query, open]);

  function go(to: string, params?: Record<string, string>) {
    onOpenChange(false);
    setQuery("");
    // navigate is type-narrowed; cast to satisfy generics for dynamic params
    navigate({ to, params } as never);
  }

  const allRoutes = SIDEBAR_GROUPS.flatMap((g) =>
    g.items.map((i) => ({ ...i, group: g.label })),
  );
  const filteredRoutes = query.trim().length === 0
    ? allRoutes
    : allRoutes.filter((r) =>
        r.label.toLowerCase().includes(query.trim().toLowerCase()),
      );

  const sections: Array<{ key: keyof typeof hits; heading: string }> = [
    { key: "relationships", heading: "Relationships" },
    { key: "operators", heading: "Operators" },
    { key: "tasks", heading: "Tasks" },
    { key: "projects", heading: "Projects" },
    { key: "components", heading: "Components" },
    { key: "sparks", heading: "Sparks" },
    { key: "quests", heading: "Quests" },
  ];

  const hasAnyHit = sections.some((s) => hits[s.key].length > 0);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search relationships, tasks, projects, components…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length >= 2 && !hasAnyHit && (
          <CommandEmpty>No matches in your data.</CommandEmpty>
        )}

        {sections.map((s) => {
          const items = hits[s.key];
          if (items.length === 0) return null;
          return (
            <CommandGroup key={s.key} heading={s.heading}>
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <CommandItem
                    key={`${s.key}-${it.id}`}
                    value={`${s.heading} ${it.label} ${it.sublabel ?? ""}`}
                    onSelect={() => go(it.to, it.params)}
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.sublabel && (
                      <span className="ml-2 truncate text-[11px] text-muted-foreground">
                        {it.sublabel}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}

        {hasAnyHit && <CommandSeparator />}

        <CommandGroup heading="Pages">
          {filteredRoutes.slice(0, 30).map((r) => {
            const Icon = r.icon ?? Target;
            return (
              <CommandItem
                key={r.to}
                value={`page ${r.group} ${r.label}`}
                onSelect={() => go(r.to)}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{r.label}</span>
                <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.group}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
