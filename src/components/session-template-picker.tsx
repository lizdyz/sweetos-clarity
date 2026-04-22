import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  value: string | null;
  onChange: (v: string | null) => void;
  serviceTypeFilter?: string | null;
  label?: string;
  className?: string;
}

interface TemplateRow {
  id: string;
  name: string;
  service_type: string | null;
  default_duration_minutes: number;
  default_sweetcycle_phase: string | null;
}

export function SessionTemplatePicker({
  value,
  onChange,
  serviceTypeFilter,
  label = "Session template",
  className,
}: Props) {
  const { data: templates = [] } = useQuery({
    queryKey: ["session_templates", serviceTypeFilter ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("session_templates" as never)
        .select("id, name, service_type, default_duration_minutes, default_sweetcycle_phase")
        .eq("enabled", true)
        .order("sort_order");
      if (serviceTypeFilter) q = q.eq("service_type", serviceTypeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TemplateRow[];
    },
  });

  return (
    <div className={className}>
      {label && <Label className="mb-1.5 block text-xs">{label}</Label>}
      <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="No template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— No template —</SelectItem>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <div className="flex flex-col">
                <span className="text-sm">{t.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t.service_type ?? "any"} · {t.default_duration_minutes}m
                  {t.default_sweetcycle_phase ? ` · ${t.default_sweetcycle_phase}` : ""}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
