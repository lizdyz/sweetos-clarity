import { useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { HandoffRow, type HandoffRowData } from "@/components/handoff-row";

type RawHandoff = Omit<HandoffRowData, "fromName" | "fromKind" | "toName" | "toKind">;
type OperatorMini = { id: string; name: string; kind: "human" | "agent" | "workflow" };

const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

export function HandoffInbox({ operatorId }: { operatorId: string }) {
  const inbound = useQuery<RawHandoff[]>({
    queryKey: ["handoff-inbox", "in", operatorId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operator_handoff_inbox")
        .select("*")
        .eq("to_operator_id", operatorId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RawHandoff[];
    },
  });

  const sent = useQuery<RawHandoff[]>({
    queryKey: ["handoff-inbox", "out", operatorId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("operator_handoff_inbox")
        .select("*")
        .eq("from_operator_id", operatorId)
        .gte("created_at", SEVEN_DAYS_AGO())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RawHandoff[];
    },
  });

  const allIds = new Set<string>();
  [...(inbound.data ?? []), ...(sent.data ?? [])].forEach((r) => {
    if (r.from_operator_id) allIds.add(r.from_operator_id);
    if (r.to_operator_id) allIds.add(r.to_operator_id);
  });

  const operators = useQuery<OperatorMini[]>({
    queryKey: ["handoff-inbox-operators", Array.from(allIds).sort().join(",")],
    queryFn: async () => {
      if (allIds.size === 0) return [];
      const { data, error } = await sb
        .from("operators")
        .select("id, name, kind")
        .in("id", Array.from(allIds));
      if (error) throw error;
      return (data ?? []) as OperatorMini[];
    },
    enabled: allIds.size > 0,
  });

  const opMap = new Map((operators.data ?? []).map((o) => [o.id, o]));
  const hydrate = (r: RawHandoff): HandoffRowData => ({
    ...r,
    fromName: r.from_operator_id ? opMap.get(r.from_operator_id)?.name ?? null : null,
    fromKind: r.from_operator_id ? opMap.get(r.from_operator_id)?.kind ?? null : null,
    toName: opMap.get(r.to_operator_id)?.name ?? null,
    toKind: opMap.get(r.to_operator_id)?.kind ?? null,
  });

  const inboundPending = (inbound.data ?? []).filter((r) => r.status === "pending");
  const inboundOther = (inbound.data ?? []).filter((r) => r.status !== "pending").slice(0, 10);

  return (
    <div className="space-y-5">
      <Section
        title={`Inbound${inboundPending.length > 0 ? ` (${inboundPending.length})` : ""}`}
        loading={inbound.isLoading}
        empty={
          (inbound.data ?? []).length === 0 ? (
            <EmptyCopy>
              No handoffs yet. Use the <strong>Hand off</strong> button on any task, project, or campaign to route it
              to another operator.
            </EmptyCopy>
          ) : null
        }
      >
        {inboundPending.length > 0 && (
          <ul className="space-y-2">
            {inboundPending.map((r) => <HandoffRow key={r.id} row={hydrate(r)} direction="inbound" />)}
          </ul>
        )}
        {inboundOther.length > 0 && (
          <>
            <div className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground">Recent</div>
            <ul className="space-y-2">
              {inboundOther.map((r) => <HandoffRow key={r.id} row={hydrate(r)} direction="inbound" />)}
            </ul>
          </>
        )}
      </Section>

      <Section
        title="Sent (last 7d)"
        loading={sent.isLoading}
        empty={(sent.data ?? []).length === 0 ? <EmptyCopy>You haven't handed anything off this week.</EmptyCopy> : null}
      >
        <ul className="space-y-2">
          {(sent.data ?? []).map((r) => <HandoffRow key={r.id} row={hydrate(r)} direction="sent" />)}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, loading, empty, children }: { title: string; loading: boolean; empty: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{title}</h3>
      {loading ? (
        <div className="rounded-lg border border-border/40 p-4 text-xs text-muted-foreground">Loading…</div>
      ) : empty ?? children}
    </div>
  );
}

function EmptyCopy({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
