// Ship-status board — honest "what's real vs aspirational" tally.
// Counts live routes (build-time glob), entity_canon coverage, and rollup view
// presence so we have one place to see the gap between IA and shipped surfaces.

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { sb } from "@/lib/sb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Vite glob — counts route files at build time. Stable across deploys.
const ROUTE_FILES = import.meta.glob("/src/routes/**/*.tsx", { eager: false });
const COMPONENT_FILES = import.meta.glob("/src/components/**/*.tsx", { eager: false });

export function ShipStatusBoard() {
  const routeCount = Object.keys(ROUTE_FILES).length;
  const componentCount = Object.keys(COMPONENT_FILES).length;

  const { data: canon } = useQuery({
    queryKey: ["ship-status", "entity-canon"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("entity_canon")
        .select("entity_kind, has_purpose:purpose, has_inputs:inputs, has_outputs:outputs")
        .limit(500);
      if (error) return { rows: [] as Array<{ entity_kind: string; has_purpose: unknown; has_inputs: unknown; has_outputs: unknown }> };
      return { rows: (data ?? []) as Array<{ entity_kind: string; has_purpose: unknown; has_inputs: unknown; has_outputs: unknown }> };
    },
  });

  const canonRows = canon?.rows ?? [];
  const canonTotal = canonRows.length;
  const canonComplete = canonRows.filter(
    (r) => Boolean(r.has_purpose) && Boolean(r.has_inputs) && Boolean(r.has_outputs),
  ).length;
  const canonCoverage = canonTotal > 0 ? Math.round((canonComplete / canonTotal) * 100) : 0;

  const stats: Array<{
    key: string;
    label: string;
    value: string | number;
    caption: string;
    tone: "ok" | "warn" | "info";
  }> = [
    { key: "routes", label: "Routes shipped", value: routeCount, caption: "files in src/routes/", tone: "ok" },
    { key: "components", label: "Components", value: componentCount, caption: "files in src/components/", tone: "info" },
    { key: "canon-total", label: "Canon entries", value: canonTotal, caption: "rows in entity_canon", tone: "info" },
    {
      key: "canon-complete",
      label: "Canon complete",
      value: `${canonCoverage}%`,
      caption: `${canonComplete} of ${canonTotal} have purpose · inputs · outputs`,
      tone: canonCoverage >= 80 ? "ok" : "warn",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.key}
            className={cn(
              "panel-raised border bg-gradient-to-b p-4",
              s.tone === "ok" && "from-emerald-500/10 to-emerald-500/5 border-emerald-500/30",
              s.tone === "warn" && "from-amber-500/10 to-amber-500/5 border-amber-500/30",
              s.tone === "info" && "from-iris/10 to-iris/5 border-iris/30",
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1.5 text-3xl font-semibold tracking-tight">{s.value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{s.caption}</div>
          </Card>
        ))}
      </div>

      <Card className="panel-raised p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Wave 9 mount status</h2>
          <Badge variant="outline" className="text-[10px]">live audit</Badge>
        </div>
        <ul className="space-y-2 text-sm">
          {WAVE_9_MOUNTS.map((m) => (
            <li key={m.label} className="flex items-start gap-2">
              {m.shipped ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.where}</div>
              </div>
              {m.href && (
                <Link
                  to={m.href}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--iris-violet)] hover:underline"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="panel-raised p-5">
        <h2 className="mb-2 text-sm font-semibold tracking-tight">Aspirational (not shipped yet)</h2>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {ASPIRATIONAL.map((a) => (
            <li key={a} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
              {a}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

interface MountRow {
  label: string;
  where: string;
  shipped: boolean;
  href?: "/today" | "/capture" | "/sweetscan" | "/sparks" | "/decisions" | "/start";
}

const WAVE_9_MOUNTS: MountRow[] = [
  { label: "EntityShell composed", where: "src/components/entity-shell.tsx", shipped: true },
  { label: "FrameworksRail on /tasks/$id", where: "Right rail with F1–F8", shipped: true },
  { label: "FrameworksRail on /decisions/$id", where: "Right rail with F1–F8", shipped: true, href: "/decisions" },
  { label: "FrameworksRail on /sparks/$id", where: "Right rail with F1–F8", shipped: true, href: "/sparks" },
  { label: "TriageCard on /sweetscan", where: "Inbound signals", shipped: true, href: "/sweetscan" },
  { label: "TriageCard on /sparks index", where: "Raw sparks rail", shipped: true, href: "/sparks" },
  { label: "TriageCard on /decisions index", where: "Proposed decisions rail", shipped: true, href: "/decisions" },
  { label: "TriageCard rail on /capture", where: "Recent proposals queue", shipped: true, href: "/capture" },
  { label: "UniversalDropZone on /today + /capture", where: "Anchor a sandbox item from anywhere", shipped: true, href: "/today" },
  { label: "Four +New create sheets wired", where: "Components · Projects · Relationships · Tasks", shipped: true },
  { label: "UniversalFilterBar honors form-control canon", where: "Chips for small enums, combobox for large", shipped: true },
];

const ASPIRATIONAL = [
  "EntityShell wrapped on every detail route (8 routes pending)",
  "Relationship SweetSync tabs (Missions · Journeys · Quests · Sparks)",
  "TriageCard rows replacing bespoke OCDA Observe lane cards",
  "Per-overlay rich frame panels (currently logs only)",
  "Real-time live signal subscription on /sweetscan",
];
