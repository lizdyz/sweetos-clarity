// Step 6 — Operators. Confirm humans / AI agents / workflows that do the work.
// Read from operators table; allow inline add of human operators with a name.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bot, ArrowLeft, CheckCircle2 } from "lucide-react";
import { InlineAddRow } from "./inline-add-row";

interface OperatorRow {
  id: string;
  display_name: string | null;
  kind: string | null;
  email: string | null;
}

interface Props {
  onBack: () => void;
  onDone: () => void;
}

export function StepOperators({ onBack, onDone }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: operators = [] } = useQuery<OperatorRow[]>({
    queryKey: ["planning", "operators-full"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operators")
        .select("id, display_name, kind, email")
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as OperatorRow[];
    },
  });

  const addOperator = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await sb.from("operators").insert({
        display_name: name,
        kind: "human",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Operator added");
      qc.invalidateQueries({ queryKey: ["planning", "operators-full"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[color:var(--iris-violet)]" />
          <h2 className="text-base font-semibold">Step 6 · Operators</h2>
        </div>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Confirm who does the work — humans, AI agents, and workflows are all
          operators in SweetOS. Tasks get assigned to one operator.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface/60 p-3">
        {operators.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
            No operators yet. Add yourself and your dev below.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-background">
            {operators.map((o) => (
              <li key={o.id}>
                <Link
                  to="/operators/$id"
                  params={{ id: o.id }}
                  className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
                      {o.display_name ?? "Unnamed operator"}
                    </span>
                    {o.email && (
                      <span className="text-[11px] text-muted-foreground">{o.email}</span>
                    )}
                  </span>
                  {o.kind && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {o.kind}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <InlineAddRow
            placeholder="e.g. Liz · Dev (Alex) · CFO Bot"
            onAdd={(v) => addOperator.mutateAsync(v).then(() => undefined)}
            busy={addOperator.isPending}
          />
        </div>
      </section>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-glow)] hover:bg-emerald-600"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Done — go to Today
        </button>
      </div>
    </div>
  );
}
