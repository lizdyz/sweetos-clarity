import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { ShieldCheck, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanonRow {
  id: string;
  entity_kind: string;
  display_name: string;
  one_liner: string | null;
  what_good_looks_like: string[];
  what_bad_looks_like: string[];
  parent_kinds: string[] | null;
  child_kinds: string[] | null;
  peer_kinds: string[] | null;
}

interface Props {
  entityKind: string;
  className?: string;
  defaultOpen?: boolean;
}

/**
 * Canon Guardrail — small strip mounted on entity detail pages.
 * Renders the "what good looks like" checklist from `entity_canon`
 * so users can sanity-check an instance against the canonical definition.
 */
export function CanonGuardrail({ entityKind, className, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const { data: canon } = useQuery({
    queryKey: ["entity_canon", entityKind],
    queryFn: async () => {
      const { data } = await supabase
        .from("entity_canon")
        .select("id, entity_kind, display_name, one_liner, what_good_looks_like, what_bad_looks_like, parent_kinds, child_kinds, peer_kinds")
        .eq("entity_kind", entityKind)
        .maybeSingle();
      return data as CanonRow | null;
    },
  });

  const parents = canon?.parent_kinds ?? [];
  const childs = canon?.child_kinds ?? [];
  const peers = canon?.peer_kinds ?? [];

  if (!canon) return null;

  const goodCount = canon.what_good_looks_like?.length ?? 0;
  const badCount = canon.what_bad_looks_like?.length ?? 0;

  return (
    <section className={cn("rounded-2xl border border-border bg-surface/60 p-3", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[color:var(--iris-violet)]" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              What a great {canon.display_name} looks like
            </div>
            {canon.one_liner && (
              <div className="truncate text-[11px] text-muted-foreground">{canon.one_liner}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            {goodCount} criteria
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              ✓ What good looks like
            </div>
            <ul className="space-y-1 text-xs">
              {canon.what_good_looks_like.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border border-border" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {badCount > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                ✗ Anti-patterns
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {canon.what_bad_looks_like.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(parents.length > 0 || childs.length > 0 || peers.length > 0) && (
            <div className="md:col-span-2 rounded-md border border-border/60 bg-background/60 p-2 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Knowledge graph</div>
              {parents.length > 0 && <GraphLine label="▲ Parent" kinds={parents} />}
              {childs.length > 0 && <GraphLine label="▼ Child" kinds={childs} />}
              {peers.length > 0 && <GraphLine label="↔ Peer" kinds={peers} />}
            </div>
          )}
          <div className="md:col-span-2 flex justify-end">
            <Link
              to="/settings/canon"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--iris-violet)] hover:underline"
            >
              Refine the canon
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function GraphLine({ label, kinds }: { label: string; kinds: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground">{label}:</span>
      {kinds.map((k) => (
        <Link
          key={k}
          to="/settings/canon"
          className="rounded-full border border-border bg-background px-1.5 py-0.5 hover:bg-iris-soft/40"
        >
          {k}
        </Link>
      ))}
    </div>
  );
}

function GraphLine({ label, kinds }: { label: string; kinds: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground">{label}:</span>
      {kinds.map((k) => (
        <Link
          key={k}
          to="/settings/canon"
          className="rounded-full border border-border bg-background px-1.5 py-0.5 hover:bg-iris-soft/40"
        >
          {k}
        </Link>
      ))}
    </div>
  );
}
