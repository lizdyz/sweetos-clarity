import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Check, ChevronDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Variant = "domains" | "tenets" | "components";

interface Option {
  id: string; // for domains/tenets this is the slug; for components it's the uuid
  label: string;
  group?: string; // for tenets: category
}

function useOptions(variant: Variant) {
  return useQuery<Option[]>({
    queryKey: ["tag-picker", variant],
    queryFn: async () => {
      if (variant === "domains") {
        const { data, error } = await supabase
          .from("domains")
          .select("slug, name")
          .eq("enabled", true)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data ?? []).map((r: { slug: string; name: string }) => ({
          id: r.slug,
          label: r.name,
        }));
      }
      if (variant === "tenets") {
        const { data, error } = await supabase
          .from("tenets")
          .select("slug, name, category")
          .eq("enabled", true)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data ?? []).map(
          (r: { slug: string; name: string; category: string }) => ({
            id: r.slug,
            label: r.name,
            group: r.category,
          }),
        );
      }
      const { data, error } = await supabase
        .from("components")
        .select("id, name")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((r: { id: string; name: string }) => ({
        id: r.id,
        label: r.name,
      }));
    },
  });
}

interface Props {
  label: string;
  variant: Variant;
  value: string[];
  onChange: (next: string[]) => void;
}

export function TagPicker({ label, variant, value, onChange }: Props) {
  const { data: options = [], isLoading } = useOptions(variant);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const labelMap = useMemo(() => {
    const m: Record<string, string> = {};
    options.forEach((o) => (m[o.id] = o.label));
    return m;
  }, [options]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const grouped = useMemo(() => {
    if (variant !== "tenets") return null;
    const g: Record<string, Option[]> = {};
    filtered.forEach((o) => {
      const key = o.group ?? "Other";
      if (!g[key]) g[key] = [];
      g[key].push(o);
    });
    const order = ["Foundation", "Specialization", "Advanced", "Mastery"];
    return order
      .filter((k) => g[k]?.length)
      .map((k) => [k, g[k]] as const);
  }, [filtered, variant]);

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-iris-soft/30"
          >
            <div className="flex flex-1 flex-wrap gap-1">
              {value.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Tag {label.toLowerCase()}…
                </span>
              )}
              {value.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-md bg-iris-soft px-1.5 py-0.5 text-[11px]"
                >
                  {labelMap[id] ?? id}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(id);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="mb-2 h-8 text-sm"
          />
          <div className="max-h-72 overflow-y-auto">
            {isLoading && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                Loading…
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No matches
              </div>
            )}
            {grouped
              ? grouped.map(([cat, items]) => (
                  <div key={cat} className="mb-2">
                    <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {cat}
                    </div>
                    {items.map((o) => (
                      <Row
                        key={o.id}
                        option={o}
                        active={value.includes(o.id)}
                        onClick={() => toggle(o.id)}
                      />
                    ))}
                  </div>
                ))
              : filtered.map((o) => (
                  <Row
                    key={o.id}
                    option={o}
                    active={value.includes(o.id)}
                    onClick={() => toggle(o.id)}
                  />
                ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Row({
  option,
  active,
  onClick,
}: {
  option: Option;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-iris-soft/40",
        active && "bg-iris-soft/60",
      )}
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded border",
          active
            ? "border-[color:var(--iris-violet)] bg-[color:var(--iris-violet)] text-white"
            : "border-border",
        )}
      >
        {active && <Check className="h-3 w-3" />}
      </span>
      <span className="flex-1 truncate">{option.label}</span>
    </button>
  );
}
