import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { sb as supabase } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import type { EntityDef, FieldDef } from "@/lib/entities";
import { ENTITIES } from "@/lib/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Plus,
  Search,
  Trash2,
  X,
  ArrowLeft,
  Loader2,
  Table as TableIcon,
  KanbanSquare,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { ConfidenceChip, ProgressionChip, StateChip } from "@/components/chips";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { KanbanBoard } from "@/components/kanban-board";
import { TagPicker } from "@/components/tag-picker";

type Row = Record<string, unknown> & { id: string; updated_at?: string; created_at?: string };

function fmtCell(field: FieldDef, value: unknown, refMap?: Record<string, string>) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground/60">—</span>;
  }
  if (field.kind === "date") {
    try {
      return <span>{format(new Date(value as string), "MMM d")}</span>;
    } catch {
      return <span>{String(value)}</span>;
    }
  }
  if (field.kind === "boolean") {
    return value ? "Yes" : "No";
  }
  if (field.kind === "currency") {
    const n = Number(value);
    return Number.isFinite(n) ? `$${n.toLocaleString()}` : String(value);
  }
  if (field.kind === "multiselect" || field.kind === "tags") {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1">
        {arr.slice(0, 3).map((v) => (
          <span key={String(v)} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
            {String(v)}
          </span>
        ))}
        {arr.length > 3 && (
          <span className="text-[11px] text-muted-foreground">+{arr.length - 3}</span>
        )}
      </div>
    );
  }
  if (field.kind === "ref") {
    if (refMap && typeof value === "string") {
      return refMap[value] ?? <span className="font-mono text-[11px] text-muted-foreground">{value.slice(0, 8)}</span>;
    }
  }
  if (field.key === "intelligence_confidence" || field.key === "confidence") {
    return <ConfidenceChip value={String(value)} />;
  }
  if (field.key === "progression_state") {
    return <ProgressionChip value={String(value)} />;
  }
  if (field.key === "state_of_the_thing") {
    return <StateChip value={String(value)} />;
  }
  return <span className="truncate">{String(value)}</span>;
}

export function EntityListPage({ entityKey }: { entityKey: string }) {
  const entity = ENTITIES[entityKey];
  if (!entity) return <div className="p-6">Unknown entity: {entityKey}</div>;
  return <EntityList entity={entity} />;
}

export function EntityDetailPage({ entityKey }: { entityKey: string }) {
  const entity = ENTITIES[entityKey];
  const params = useParams({ strict: false }) as { id?: string };
  if (!entity) return <div className="p-6">Unknown entity: {entityKey}</div>;
  if (!params.id) return <div className="p-6">No id</div>;
  return <EntityDetail entity={entity} id={params.id} />;
}

// =========================================================================
// LIST
// =========================================================================
type ViewMode = "table" | "board" | "cards";

const BOARD_GROUP_BY: Record<string, { field: string; options: readonly string[] }> = {
  tasks: { field: "status", options: [] },
  projects: { field: "status", options: [] },
  campaigns: { field: "status", options: [] },
  documents: { field: "status", options: [] },
  quests: { field: "progression_state", options: [] },
  sparks: { field: "progression_state", options: [] },
  sessions: { field: "progression_state", options: [] },
  relationships: { field: "pipeline_stage", options: [] },
  components: { field: "current_maturity_level", options: [] },
  personas: { field: "spec_status", options: [] },
  playbooks: { field: "spec_status", options: [] },
};

const DEFAULT_VIEW: Record<string, ViewMode> = {
  tasks: "board",
  quests: "board",
  sparks: "board",
  relationships: "board",
  documents: "cards",
  components: "cards",
  personas: "cards",
  playbooks: "cards",
};

function EntityList({ entity }: { entity: EntityDef }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const storageKey = `entity-view:${entity.key}`;
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return DEFAULT_VIEW[entity.key] ?? "table";
    return (
      (window.localStorage.getItem(storageKey) as ViewMode | null) ??
      DEFAULT_VIEW[entity.key] ??
      "table"
    );
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, view);
    }
  }, [view, storageKey]);

  const sortKey = entity.defaultSort?.key ?? "updated_at";
  const sortDir = entity.defaultSort?.dir ?? "desc";

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: [entity.table, "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(entity.table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("*" as any)
        .order(sortKey, { ascending: sortDir === "asc" });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const refFields = useMemo(() => entity.fields.filter((f) => f.kind === "ref" && f.inList), [entity]);
  const refMaps = useRefMaps(refFields);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      entity.fields.some((f) => {
        const v = row[f.key];
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
  }, [data, search, entity]);

  const listFields = entity.fields.filter((f) => f.inList);

  // Determine kanban columns dynamically: union of board's group-by enum + values present in data
  const boardConfig = BOARD_GROUP_BY[entity.key];
  const boardField = boardConfig?.field;
  const boardColumns = useMemo<string[]>(() => {
    if (!boardField) return [];
    const fieldDef = entity.fields.find((f) => f.key === boardField);
    const fromOptions = fieldDef?.options ? Array.from(fieldDef.options) : [];
    const fromData = Array.from(
      new Set(
        (data ?? [])
          .map((r) => r[boardField] as string | null | undefined)
          .filter((v): v is string => Boolean(v)),
      ),
    );
    const merged: string[] = [];
    for (const c of fromOptions) if (!merged.includes(c)) merged.push(c);
    for (const c of fromData) if (!merged.includes(c)) merged.push(c);
    return merged;
  }, [boardField, entity, data]);

  async function moveCard(rowId: string, newValue: string) {
    if (!boardField) return;
    const { error } = await supabase
      .from(entity.table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ [boardField]: newValue } as any)
      .eq("id", rowId);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: [entity.table] });
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{entity.labelPlural}</h1>
          <p className="text-sm text-muted-foreground">
            {data?.length ?? 0} {entity.labelPlural.toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewSwitcher view={view} onChange={setView} hasBoard={Boolean(boardField)} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
              className="h-9 w-56 rounded-xl pl-8"
            />
          </div>
          <Button onClick={() => setCreating(true)} className="bg-iris text-white">
            <Plus className="mr-1 h-4 w-4" /> New {entity.label.toLowerCase()}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid h-48 place-items-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel grid place-items-center px-6 py-16 text-center text-sm text-muted-foreground">
          <div>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-iris-soft">
              <Plus className="h-5 w-5 text-[color:var(--iris-violet)]" />
            </div>
            No {entity.labelPlural.toLowerCase()} yet.
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                Create the first one
              </Button>
            </div>
          </div>
        </div>
      ) : view === "board" && boardField ? (
        <KanbanBoard
          entity={entity}
          groupBy={boardField}
          columns={boardColumns}
          rows={filtered}
          onMove={moveCard}
        />
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => (
            <EntityCard
              key={row.id}
              row={row}
              entity={entity}
              onOpen={() => navigate({ to: `/${entity.key}/${row.id}` })}
            />
          ))}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  {listFields.map((f) => (
                    <th key={f.key} className="px-4 py-2.5 font-semibold">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate({ to: `/${entity.key}/${row.id}` })}
                    className="cursor-pointer transition-colors hover:bg-iris-soft/40"
                  >
                    {listFields.map((f) => (
                      <td
                        key={f.key}
                        className={cn(
                          "max-w-[260px] truncate px-4 py-2.5",
                          f.primary && "font-medium text-foreground",
                        )}
                      >
                        {fmtCell(f, row[f.key], f.kind === "ref" ? refMaps[f.refTable!] : undefined)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      {row.updated_at ? format(new Date(row.updated_at), "MMM d") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating && (
        <EntityFormSheet
          entity={entity}
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            navigate({ to: `/${entity.key}/${id}` });
          }}
        />
      )}
    </div>
  );
}

function ViewSwitcher({
  view,
  onChange,
  hasBoard,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
  hasBoard: boolean;
}) {
  const opts: Array<{ key: ViewMode; label: string; icon: typeof TableIcon; disabled?: boolean }> = [
    { key: "table", label: "Table", icon: TableIcon },
    { key: "board", label: "Board", icon: KanbanSquare, disabled: !hasBoard },
    { key: "cards", label: "Cards", icon: LayoutGrid },
  ];
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-surface p-0.5">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = view === o.key;
        return (
          <button
            key={o.key}
            type="button"
            disabled={o.disabled}
            onClick={() => onChange(o.key)}
            title={o.disabled ? `${o.label} not available for this entity` : o.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-iris text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              o.disabled && "opacity-40",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function EntityCard({
  row,
  entity,
  onOpen,
}: {
  row: Row;
  entity: EntityDef;
  onOpen: () => void;
}) {
  const headline = (row[entity.primaryField] as string) || "Untitled";
  const owner = (row.owner as string) || (row.created_by as string) || null;
  const due =
    (row.due_date as string) ||
    (row.deadline as string) ||
    (row.next_action_due as string) ||
    null;
  const tags = (row.tagged_domains as string[] | null) ?? [];
  const status =
    (row.status as string) ||
    (row.spec_status as string) ||
    (row.progression_state as string) ||
    null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="panel-raised group flex flex-col gap-2 p-4 text-left transition-shadow hover:shadow-[var(--shadow-glow)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="line-clamp-2 text-sm font-medium text-foreground">{headline}</div>
        {status && (
          <span className="shrink-0 rounded-md bg-iris-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
            {status}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {owner && <span className="truncate">{owner}</span>}
        {due && (
          <>
            {owner && <span>·</span>}
            <span>{(() => { try { return format(new Date(due), "MMM d"); } catch { return due; } })()}</span>
          </>
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px]">
              {t}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{tags.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );
}


// =========================================================================
// DETAIL
// =========================================================================
function EntityDetail({ entity, id }: { entity: EntityDef; id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: row, isLoading } = useQuery({
    queryKey: [entity.table, "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(entity.table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("*" as any)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });

  const refFields = entity.fields.filter((f) => f.kind === "ref");
  const refMaps = useRefMaps(refFields);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(entity.table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${entity.label} deleted`);
      queryClient.invalidateQueries({ queryKey: [entity.table] });
      navigate({ to: `/${entity.key}` });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!row) return <div className="p-6">Not found</div>;

  const ownerOk = (row.created_by as string | undefined) === user?.id || isAdmin;

  // group fields
  const groups: Record<string, FieldDef[]> = {};
  entity.fields.forEach((f) => {
    const g = f.group ?? "Details";
    if (!groups[g]) groups[g] = [];
    groups[g].push(f);
  });

  const headline = (row[entity.primaryField] as string) || `Untitled ${entity.label}`;

  return (
    <div className="px-6 py-5">
      <button
        onClick={() => navigate({ to: `/${entity.key}` })}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {entity.labelPlural}
      </button>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{headline}</h1>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          {ownerOk && (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete this ${entity.label.toLowerCase()}?`)) del.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {Object.entries(groups).map(([group, fields]) => (
            <section key={group} className="panel p-5">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group}
              </h2>
              <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.key} className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {f.label}
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      {fmtCell(f, row[f.key], f.kind === "ref" ? refMaps[f.refTable!] : undefined)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <aside className="space-y-5">
          <section className="panel p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Meta
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {row.created_at ? format(new Date(row.created_at), "MMM d, yyyy") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>
                  {row.updated_at ? format(new Date(row.updated_at), "MMM d, yyyy") : "—"}
                </span>
              </div>
            </div>
          </section>

          {entity.key === "sessions" && row.sweetcycle_phase ? (
            <SweetCycleLadder current={String(row.sweetcycle_phase)} />
          ) : null}
        </aside>
      </div>

      {editing && (
        <EntityFormSheet
          entity={entity}
          row={row}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: [entity.table] });
          }}
        />
      )}
    </div>
  );
}

function SweetCycleLadder({ current }: { current: string }) {
  const phases = ["Seed", "Synthesize", "Session", "Sync", "Ship"];
  const idx = phases.indexOf(current);
  return (
    <section className="panel p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        SweetCycle phase
      </h2>
      <ol className="space-y-2">
        {phases.map((p, i) => (
          <li
            key={p}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
              i < idx && "text-muted-foreground",
              i === idx && "bg-iris-soft font-medium text-foreground",
              i > idx && "text-muted-foreground/70",
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
                i < idx && "bg-success text-success-foreground",
                i === idx && "bg-iris text-white",
                i > idx && "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
    </section>
  );
}

// =========================================================================
// FORM SHEET
// =========================================================================
function EntityFormSheet({
  entity,
  row,
  onClose,
  onSaved,
}: {
  entity: EntityDef;
  row?: Row;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    entity.fields.forEach((f) => {
      v[f.key] = row?.[f.key] ?? defaultForKind(f);
    });
    return v;
  });
  const [busy, setBusy] = useState(false);

  function setField(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    try {
      // Coerce empty strings on optional fields to null
      const payload: Record<string, unknown> = {};
      entity.fields.forEach((f) => {
        let v = values[f.key];
        if (v === "" || v === undefined) v = null;
        if (f.kind === "number" || f.kind === "currency") {
          v = v === null || v === "" ? null : Number(v);
        }
        payload[f.key] = v;
      });

      let savedId = row?.id;
      if (row) {
        const { error } = await supabase.from(entity.table).update(payload).eq("id", row.id);
        if (error) throw error;
        toast.success(`${entity.label} updated`);
      } else {
        const { data, error } = await supabase
          .from(entity.table)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        savedId = (data as { id: string }).id;
        toast.success(`${entity.label} created`);
      }
      queryClient.invalidateQueries({ queryKey: [entity.table] });
      onSaved(savedId!);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // group fields
  const groups: Record<string, FieldDef[]> = {};
  entity.fields.forEach((f) => {
    const g = f.group ?? "Details";
    if (!groups[g]) groups[g] = [];
    groups[g].push(f);
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {row ? `Edit ${entity.label.toLowerCase()}` : `New ${entity.label.toLowerCase()}`}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-4">
          {Object.entries(groups).map(([group, fields]) => (
            <div key={group} className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group}
              </h3>
              {fields.map((f) => (
                <FieldEditor key={f.key} field={f} value={values[f.key]} onChange={(v) => setField(f.key, v)} />
              ))}
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy} className="bg-iris text-white">
            {busy ? "Saving…" : row ? "Save changes" : `Create ${entity.label.toLowerCase()}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function defaultForKind(f: FieldDef): unknown {
  if (f.kind === "boolean") return false;
  if (f.kind === "multiselect" || f.kind === "tags") return [];
  return "";
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}): ReactNode {
  const v = (value ?? "") as string;

  if (field.kind === "longtext") {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <Textarea
          value={v}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="rounded-xl"
        />
      </div>
    );
  }
  if (field.kind === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2">
        <Label className="text-sm">{field.label}</Label>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }
  if (field.kind === "select") {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <Select value={v || undefined} onValueChange={(val) => onChange(val)}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}…`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.kind === "multiselect" || field.kind === "tags") {
    return (
      <MultiSelect
        label={field.label}
        options={field.options}
        value={(value as string[]) ?? []}
        onChange={onChange as (v: string[]) => void}
        allowCustom={field.kind === "tags"}
      />
    );
  }
  if (field.kind === "ref") {
    return (
      <RefSelect
        label={field.label}
        table={field.refTable!}
        labelField={field.refLabel ?? "name"}
        value={v}
        onChange={onChange as (v: string | null) => void}
      />
    );
  }
  if (field.kind === "date") {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <Input
          type="date"
          value={v ? String(v).slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl"
        />
      </div>
    );
  }
  if (field.kind === "number" || field.kind === "currency") {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <Input
          type="number"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl"
        />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      <Input value={v} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </div>
  );
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
  allowCustom,
}: {
  label: string;
  options?: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean;
}) {
  const [custom, setCustom] = useState("");
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface p-2">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-iris-soft px-2 py-0.5 text-xs"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="px-1 text-xs text-muted-foreground">None selected</span>
        )}
      </div>
      {options && (
        <div className="flex flex-wrap gap-1">
          {options
            .filter((o) => !value.includes(o))
            .map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onChange([...value, o])}
                className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-iris-soft hover:text-foreground"
              >
                + {o}
              </button>
            ))}
        </div>
      )}
      {allowCustom && (
        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Add tag…"
            className="h-8 rounded-lg text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (custom.trim()) {
                onChange([...value, custom.trim()]);
                setCustom("");
              }
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function RefSelect({
  label,
  table,
  labelField,
  value,
  onChange,
}: {
  label: string;
  table: string;
  labelField: string;
  value: string;
  onChange: (v: string | null) => void;
}) {
  const { data } = useQuery({
    queryKey: [table, "ref-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select(`id, ${labelField}` as any)
        .order(labelField, { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as Array<Record<string, string>>;
    },
  });
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={value || "__none"}
        onValueChange={(v) => onChange(v === "__none" ? null : v)}
      >
        <SelectTrigger className="rounded-xl">
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— None —</SelectItem>
          {(data ?? []).map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r[labelField] || r.id.slice(0, 8)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function useRefMaps(refFields: FieldDef[]): Record<string, Record<string, string>> {
  const tables = Array.from(
    new Set(refFields.map((f) => f.refTable!).filter(Boolean)),
  );
  const queries = useQuery({
    queryKey: ["ref-maps", tables.sort().join(",")],
    enabled: tables.length > 0,
    queryFn: async () => {
      const result: Record<string, Record<string, string>> = {};
      for (const t of tables) {
        const labelField =
          refFields.find((f) => f.refTable === t)?.refLabel ?? "name";
        const { data } = await supabase
          .from(t)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .select(`id, ${labelField}` as any)
          .limit(500);
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: Record<string, string>) => {
          const row = r as Record<string, string>;
          map[row.id] = row[labelField] ?? "";
        });
        result[t] = map;
      }
      return result;
    },
  });
  return queries.data ?? {};
}
