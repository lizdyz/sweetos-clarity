import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Layers, Loader2, Plus, ListChecks, Folder, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { sb } from "@/lib/sb";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/planner")({
  component: PlannerPage,
});

type Lane = "this_week" | "next_week" | "backlog";
type Kind = "task" | "project" | "campaign";

interface Item {
  id: string;
  kind: Kind;
  name: string;
  scheduled_for: string | null;
  status: string | null;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function laneFor(scheduled: string | null, monThis: string, monNext: string): Lane {
  if (!scheduled) return "backlog";
  if (scheduled >= monNext) return scheduled < addDays(monNext, 7) ? "next_week" : "backlog";
  if (scheduled >= monThis) return "this_week";
  return "backlog";
}
function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function PlannerPage() {
  const qc = useQueryClient();
  const monThis = fmt(startOfWeek(new Date()));
  const monNext = addDays(monThis, 7);

  const { data: tasks = [], isLoading: lt } = useQuery({
    queryKey: ["planner", "tasks"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("tasks")
        .select("id, name, scheduled_for, status")
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as Array<Omit<Item, "kind">>).map((r) => ({ ...r, kind: "task" as const }));
    },
  });
  const { data: projects = [], isLoading: lp } = useQuery({
    queryKey: ["planner", "projects"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("projects")
        .select("id, name:project_name, scheduled_for, status")
        .limit(200);
      if (error) {
        // fallback if column name differs
        const { data: d2, error: e2 } = await sb
          .from("projects")
          .select("id, name, scheduled_for, status")
          .limit(200);
        if (e2) throw e2;
        return ((d2 ?? []) as Array<Omit<Item, "kind">>).map((r) => ({ ...r, kind: "project" as const }));
      }
      return ((data ?? []) as Array<Omit<Item, "kind">>).map((r) => ({ ...r, kind: "project" as const }));
    },
  });
  const { data: campaigns = [], isLoading: lc } = useQuery({
    queryKey: ["planner", "campaigns"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("campaigns")
        .select("id, name:campaign_name, scheduled_for, status")
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as Array<Omit<Item, "kind">>).map((r) => ({ ...r, kind: "campaign" as const }));
    },
  });

  const all: Item[] = useMemo(
    () => [...tasks, ...projects, ...campaigns],
    [tasks, projects, campaigns],
  );

  const byLane = useMemo(() => {
    const g: Record<Lane, Item[]> = { this_week: [], next_week: [], backlog: [] };
    all.forEach((it) => g[laneFor(it.scheduled_for, monThis, monNext)].push(it));
    return g;
  }, [all, monThis, monNext]);

  const move = useMutation({
    mutationFn: async ({ item, lane }: { item: Item; lane: Lane }) => {
      const scheduled = lane === "this_week" ? monThis : lane === "next_week" ? monNext : null;
      const table = item.kind === "task" ? "tasks" : item.kind === "project" ? "projects" : "campaigns";
      const { error } = await sb.from(table).update({ scheduled_for: scheduled }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rescheduled");
      qc.invalidateQueries({ queryKey: ["planner"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quickAdd = useMutation({
    mutationFn: async ({ name, lane }: { name: string; lane: Lane }) => {
      const scheduled = lane === "this_week" ? monThis : lane === "next_week" ? monNext : null;
      const { error } = await sb.from("tasks").insert({ name, scheduled_for: scheduled, status: "To Do" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task added");
      qc.invalidateQueries({ queryKey: ["planner"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isLoading = lt || lp || lc;

  return (
    <div className="px-6 py-6">
      <PageHeader
        icon={<Layers className="h-5 w-5" />}
        title="Planner"
        purpose="The write side of Today. Decide what you're working on this week, next week, or later — then Today shows you what's due."
        whatYouCanDo={[
          "Drag any card between lanes to reschedule",
          "Quick-add a task at the bottom of a lane",
          "See workload at a glance",
        ]}
      />
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading planner…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["this_week", "next_week", "backlog"] as Lane[]).map((lane) => (
            <LaneCard
              key={lane}
              lane={lane}
              items={byLane[lane]}
              onMove={(item, target) => move.mutate({ item, lane: target })}
              onAdd={(name) => quickAdd.mutate({ name, lane })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const LANE_LABEL: Record<Lane, string> = {
  this_week: "This week",
  next_week: "Next week",
  backlog: "Backlog",
};

function LaneCard({
  lane,
  items,
  onMove,
  onAdd,
}: {
  lane: Lane;
  items: Item[];
  onMove: (item: Item, target: Lane) => void;
  onAdd: (name: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const counts = {
    task: items.filter((i) => i.kind === "task").length,
    project: items.filter((i) => i.kind === "project").length,
    campaign: items.filter((i) => i.kind === "campaign").length,
  };
  return (
    <Card
      className="panel-raised flex min-h-[60vh] flex-col gap-2 p-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const data = e.dataTransfer.getData("application/json");
        if (!data) return;
        const item = JSON.parse(data) as Item;
        onMove(item, lane);
      }}
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">{LANE_LABEL[lane]}</h2>
        <span className="text-[10px] text-muted-foreground">
          {counts.task} · {counts.project} · {counts.campaign}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center text-[11px] text-muted-foreground">
            Drop items here
          </div>
        )}
        {items.map((it) => (
          <ItemCard key={`${it.kind}-${it.id}`} item={it} />
        ))}
      </div>
      <form
        className="flex items-center gap-1 border-t border-border/50 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onAdd(draft.trim());
          setDraft("");
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="+ quick task…"
          className="h-7 text-[11px]"
        />
        <Button size="sm" variant="ghost" type="submit" className="h-7 px-2">
          <Plus className="h-3 w-3" />
        </Button>
      </form>
    </Card>
  );
}

const KIND_ICON = { task: ListChecks, project: Folder, campaign: Megaphone } as const;
const KIND_TONE: Record<Kind, string> = {
  task: "bg-iris/10 text-[color:var(--iris-violet)]",
  project: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  campaign: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

function ItemCard({ item }: { item: Item }) {
  const Icon = KIND_ICON[item.kind];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(item));
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group cursor-grab rounded-lg border border-border/60 bg-surface px-2.5 py-2 text-xs shadow-[var(--shadow-glass)] transition hover:border-iris/40 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5 grid h-5 w-5 place-items-center rounded-md", KIND_TONE[item.kind])}>
          <Icon className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{item.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {item.status && (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                {item.status}
              </Badge>
            )}
            {item.scheduled_for && <span>· {item.scheduled_for}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
