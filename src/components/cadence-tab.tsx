import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  CADENCE_CATEGORIES,
  CADENCE_CATEGORY_LABELS,
  useCadenceSettings,
  type CadenceCategory,
  type CadenceSetting,
} from "@/lib/use-cadence";

export function CadenceTab({ isAdmin }: { isAdmin: boolean }) {
  const { data, isLoading } = useCadenceSettings();

  if (isLoading) {
    return (
      <div className="grid place-items-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const grouped: Record<string, CadenceSetting[]> = {};
  for (const row of data ?? []) {
    (grouped[row.category] ??= []).push(row);
  }

  return (
    <div className="space-y-5">
      {!isAdmin && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          View-only. Ask an admin to adjust cadence values.
        </div>
      )}
      {CADENCE_CATEGORIES.map((cat) => {
        const rows = grouped[cat] ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={cat} className="panel p-0">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">
                {CADENCE_CATEGORY_LABELS[cat as CadenceCategory]}
              </h2>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <CadenceRow key={row.id} row={row} disabled={!isAdmin} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CadenceRow({ row, disabled }: { row: CadenceSetting; disabled: boolean }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<string>(String(row.value_number));
  const [busy, setBusy] = useState(false);

  async function save() {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      setValue(String(row.value_number));
      return;
    }
    if (num === Number(row.value_number)) return;
    if (row.min_value != null && num < Number(row.min_value)) {
      toast.error(`Minimum is ${row.min_value}`);
      setValue(String(row.value_number));
      return;
    }
    if (row.max_value != null && num > Number(row.max_value)) {
      toast.error(`Maximum is ${row.max_value}`);
      setValue(String(row.value_number));
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("cadence_settings")
      .update({ value_number: num })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      setValue(String(row.value_number));
      return;
    }
    toast.success(`${row.label} updated`);
    qc.invalidateQueries({ queryKey: ["cadence-settings"] });
  }

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-medium">{row.label}</Label>
        {row.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          disabled={disabled || busy}
          min={row.min_value ?? undefined}
          max={row.max_value ?? undefined}
          step={row.step_value ?? 1}
          className="w-24 rounded-xl text-right"
        />
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </li>
  );
}
