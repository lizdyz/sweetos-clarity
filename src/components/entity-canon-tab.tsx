// Read-only Canon tab body — pulls the canonical definition for an entity_kind
// from the `entity_canon` table. Wisdom can read everywhere; edit is at /settings/canon.

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { ArrowRight, ShieldCheck, BookOpen, Sparkles, Repeat, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanonRow {
  id: string;
  entity_kind: string;
  display_name: string;
  one_liner: string | null;
  what_it_is: string | null;
  what_good_looks_like: string[];
  what_bad_looks_like: string[];
  inputs: string[];
  outputs: string[];
  reinforcement_loop: string | null;
}

interface Props {
  entityKind: string;
  className?: string;
}

export function EntityCanonTab({ entityKind, className }: Props) {
  const { data: canon, isLoading } = useQuery({
    queryKey: ["entity_canon", entityKind],
    queryFn: async () => {
      const { data } = await supabase
        .from("entity_canon")
        .select("id, entity_kind, display_name, one_liner, what_it_is, what_good_looks_like, what_bad_looks_like, inputs, outputs, reinforcement_loop")
        .eq("entity_kind", entityKind)
        .maybeSingle();
      return data as CanonRow | null;
    },
  });

  if (isLoading) return <div className="p-6 text-xs text-muted-foreground">Loading canon…</div>;

  if (!canon) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <BookOpen className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm">No canonical definition yet for <span className="font-mono text-xs">{entityKind}</span>.</p>
          <Link
            to="/settings/canon"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--iris-violet)] hover:underline"
          >
            Define it in canon settings <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 p-6", className)}>
      {/* Header */}
      <header className="flex items-start gap-3 border-b border-border/40 pb-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-iris-soft text-[color:var(--iris-violet)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Canon</div>
          <h2 className="text-lg font-semibold tracking-tight">{canon.display_name}</h2>
          {canon.one_liner && (
            <p className="mt-0.5 text-sm text-muted-foreground">{canon.one_liner}</p>
          )}
        </div>
        <Link
          to="/settings/canon"
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-iris-soft/40"
        >
          Refine
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {/* What it is */}
      {canon.what_it_is && (
        <section>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What it is
          </h3>
          <p className="text-sm leading-relaxed">{canon.what_it_is}</p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* What good looks like */}
        {canon.what_good_looks_like?.length > 0 && (
          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" /> What good looks like
            </h3>
            <ul className="space-y-1.5 text-xs">
              {canon.what_good_looks_like.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Anti-patterns */}
        {canon.what_bad_looks_like?.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-400">
              ✗ Anti-patterns
            </h3>
            <ul className="space-y-1.5 text-xs">
              {canon.what_bad_looks_like.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Inputs / Outputs */}
      {(canon.inputs?.length > 0 || canon.outputs?.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {canon.inputs?.length > 0 && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <ArrowDownToLine className="h-3 w-3" /> Inputs
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {canon.inputs.map((i) => (
                  <span key={i} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px]">
                    {i}
                  </span>
                ))}
              </div>
            </section>
          )}
          {canon.outputs?.length > 0 && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <ArrowUpFromLine className="h-3 w-3" /> Outputs
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {canon.outputs.map((o) => (
                  <span key={o} className="rounded-full border border-border bg-iris-soft px-2 py-0.5 text-[11px]">
                    {o}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Reinforcement loop */}
      {canon.reinforcement_loop && (
        <section className="rounded-xl border border-border bg-surface/50 p-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Repeat className="h-3 w-3" /> Reinforcement loop
          </h3>
          <p className="text-sm leading-relaxed">{canon.reinforcement_loop}</p>
        </section>
      )}
    </div>
  );
}
