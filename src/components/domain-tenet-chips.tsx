import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface DualChipsProps {
  selectedDomains: string[]; // slugs
  selectedTenets: string[]; // codes or ids
  onChangeDomains: (next: string[]) => void;
  onChangeTenets: (next: string[]) => void;
  industryId?: string | null;
  readOnly?: boolean;
  className?: string;
}

interface DomainRow {
  id: string;
  slug: string;
  name: string;
  color: string;
}

interface TenetRow {
  id: string;
  code: string;
  name: string;
  category: string | null;
}

function categoryDot(cat: string | null | undefined): string {
  switch ((cat ?? "").toLowerCase()) {
    case "foundation":
      return "bg-emerald-500";
    case "specialization":
      return "bg-sky-500";
    case "advanced":
      return "bg-violet-500";
    case "mastery":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/40";
  }
}

export function DomainTenetChips({
  selectedDomains,
  selectedTenets,
  onChangeDomains,
  onChangeTenets,
  industryId,
  readOnly,
  className,
}: DualChipsProps) {
  const { data: domains = [] } = useQuery<DomainRow[]>({
    queryKey: ["domains", "all-enabled"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("domains")
        .select("id, slug, name, color")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tenets = [] } = useQuery<TenetRow[]>({
    queryKey: ["tenets", "all", industryId ?? "any"],
    queryFn: async () => {
      let q = sb.from("tenets").select("id, code, name, category, industry_id").eq("enabled", true);
      if (industryId) q = q.eq("industry_id", industryId);
      const { data, error } = await q.order("code");
      if (error) {
        // tenets table may not yet exist — return empty silently
        return [];
      }
      return data ?? [];
    },
  });

  const domainBySlug = useMemo(() => new Map(domains.map((d) => [d.slug, d])), [domains]);
  const tenetByKey = useMemo(() => {
    const m = new Map<string, TenetRow>();
    tenets.forEach((t) => {
      m.set(t.code, t);
      m.set(t.id, t);
    });
    return m;
  }, [tenets]);

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      <ChipGroup
        title="Domains"
        subtitle="Universal · 22"
        readOnly={readOnly}
        items={selectedDomains.map((slug) => {
          const d = domainBySlug.get(slug);
          return {
            key: slug,
            label: d?.name ?? slug,
            color: d?.color,
          };
        })}
        onRemove={(key) => onChangeDomains(selectedDomains.filter((s) => s !== key))}
        picker={
          <DomainPicker
            options={domains.filter((d) => !selectedDomains.includes(d.slug))}
            onPick={(slug) => onChangeDomains([...selectedDomains, slug])}
          />
        }
      />
      <ChipGroup
        title="Tenets"
        subtitle="Industry-scoped"
        readOnly={readOnly}
        items={selectedTenets.map((key) => {
          const t = tenetByKey.get(key);
          return {
            key,
            label: t ? `${t.code} ${t.name}` : key,
            dot: categoryDot(t?.category),
          };
        })}
        onRemove={(key) => onChangeTenets(selectedTenets.filter((s) => s !== key))}
        picker={
          <TenetPicker
            options={tenets.filter((t) => !selectedTenets.includes(t.code) && !selectedTenets.includes(t.id))}
            onPick={(code) => onChangeTenets([...selectedTenets, code])}
          />
        }
      />
    </div>
  );
}

function ChipGroup({
  title,
  subtitle,
  items,
  onRemove,
  picker,
  readOnly,
}: {
  title: string;
  subtitle: string;
  items: Array<{ key: string; label: string; color?: string; dot?: string }>;
  onRemove: (key: string) => void;
  picker: React.ReactNode;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold tracking-tight">{title}</div>
          <div className="text-[10px] text-muted-foreground">{subtitle}</div>
        </div>
        {!readOnly && picker}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && (
          <span className="text-[11px] text-muted-foreground">None tagged.</span>
        )}
        {items.map((it) => (
          <span
            key={it.key}
            className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background px-2 py-0.5 text-[11px]"
            style={it.color ? { borderColor: it.color } : undefined}
          >
            {it.dot && <span className={cn("h-1.5 w-1.5 rounded-full", it.dot)} />}
            {it.label}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemove(it.key)}
                className="ml-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${it.label}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function DomainPicker({ options, onPick }: { options: DomainRow[]; onPick: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px]">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search domains…" />
          <CommandList>
            <CommandEmpty>No domains.</CommandEmpty>
            <CommandGroup>
              {options.map((d) => (
                <CommandItem
                  key={d.slug}
                  value={`${d.slug} ${d.name}`}
                  onSelect={() => {
                    onPick(d.slug);
                    setOpen(false);
                  }}
                >
                  {d.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TenetPicker({ options, onPick }: { options: TenetRow[]; onPick: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px]">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search tenets…" />
          <CommandList>
            <CommandEmpty>No tenets configured.</CommandEmpty>
            <CommandGroup>
              {options.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.code} ${t.name}`}
                  onSelect={() => {
                    onPick(t.code);
                    setOpen(false);
                  }}
                >
                  <span className={cn("mr-2 h-1.5 w-1.5 rounded-full", categoryDot(t.category))} />
                  <span className="font-mono text-[10px] text-muted-foreground">{t.code}</span>
                  <span className="ml-2">{t.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
