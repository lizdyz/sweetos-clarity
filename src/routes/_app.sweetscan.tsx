import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Radar, Loader2, Play, Inbox, Flame, Eye, Globe, ListChecks } from "lucide-react";
import { WatchlistDashboard } from "@/components/sweetscan/watchlist-dashboard";
import { KtiPanel } from "@/components/kti-panel";
import { type InboundSignal } from "@/components/inbound-signal-card";
import { TriageCard } from "@/components/triage-card";
import { inboundSignalToTriageable } from "@/lib/triage-adapters";
import { useTriagePromote } from "@/lib/use-triage-promote";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/sweetscan")({
  component: SweetScanPage,
});

/**
 * SweetScan — the outside-in intelligence surface.
 * Forward radar (KTIs) · Rubric scanner · World Watch · Signal inbox.
 * See `mem://design/sweetscan-as-eyes-and-ears.md`.
 */
function SweetScanPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Radar className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SweetScan</h1>
          <p className="text-sm text-muted-foreground">
            Outside-in intelligence — what the world is telling us, before it arrives.
          </p>
        </div>
      </header>

      <Tabs defaultValue="watchlist">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="watchlist" className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" /> Watchlist
          </TabsTrigger>
          <TabsTrigger value="radar" className="gap-1.5">
            <Radar className="h-3.5 w-3.5" /> Forward radar
          </TabsTrigger>
          <TabsTrigger value="rubric" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Rubric scanner
          </TabsTrigger>
          <TabsTrigger value="world" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> World Watch
          </TabsTrigger>
          <TabsTrigger value="inbox" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" /> Signal inbox
          </TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist" className="pt-4">
          <WatchlistDashboard />
        </TabsContent>
        <TabsContent value="radar" className="pt-4">
          <ForwardRadarTab />
        </TabsContent>
        <TabsContent value="rubric" className="pt-4">
          <RubricScannerTab />
        </TabsContent>
        <TabsContent value="world" className="pt-4">
          <WorldWatchTab />
        </TabsContent>
        <TabsContent value="inbox" className="pt-4">
          <SignalInboxTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ForwardRadarTab() {
  const { data: domains = [] } = useQuery({
    queryKey: ["sweetscan", "domains"],
    queryFn: async () => {
      const { data } = await sb.from("domains").select("id, name").order("name");
      return data ?? [];
    },
  });

  const [scope, setScope] = useState<"all" | "universal">("all");
  const [domainId, setDomainId] = useState<string | "all">("all");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Scope
        </span>
        <Button
          size="sm"
          variant={scope === "all" ? "default" : "outline"}
          className="h-7 px-2 text-[11px]"
          onClick={() => setScope("all")}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={scope === "universal" ? "default" : "outline"}
          className="h-7 px-2 text-[11px]"
          onClick={() => setScope("universal")}
        >
          Universal only
        </Button>
        <span className="ml-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Domain
        </span>
        <Select value={domainId} onValueChange={(v) => setDomainId(v as string)}>
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {domains.map((d: { id: string; name: string }) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <KtiPanel
        relationshipId={scope === "universal" ? null : undefined}
        domainId={domainId === "all" ? null : domainId}
      />
    </div>
  );
}

function RubricScannerTab() {
  const { data: domains = [] } = useQuery({
    queryKey: ["sweetscan", "domains"],
    queryFn: async () => {
      const { data } = await sb.from("domains").select("id, name").order("name");
      return data ?? [];
    },
  });

  const [domainId, setDomainId] = useState<string>("");
  const selectedDomain = useMemo(
    () => domains.find((d: { id: string }) => d.id === domainId),
    [domainId, domains],
  );
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState("");

  const run = useMutation({
    mutationFn: async () => {
      if (!domainId) throw new Error("Select a domain first.");
      const { data, error } = await supabase.functions.invoke("scan-signals", {
        body: {
          mode: "rubric",
          domain_id: domainId,
          query: query || `${(selectedDomain as { name: string } | undefined)?.name ?? ""} best practices 2025`,
          sources: sources.split(/\n+/).map((s) => s.trim()).filter(Boolean),
        },
      });
      if (error) throw error;
      return data as { proposals_created: number };
    },
    onSuccess: (d) => toast.success(`${d.proposals_created} checklist proposal(s) created`),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="panel-raised space-y-3 p-4">
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Domain
        </label>
        <Select value={domainId} onValueChange={setDomainId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Pick a domain to scan…" />
          </SelectTrigger>
          <SelectContent>
            {domains.map((d: { id: string; name: string }) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Query
        </label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`${(selectedDomain as { name: string } | undefined)?.name ?? "<domain>"} best practices 2025`}
          className="mt-1 text-sm"
        />
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Source URLs (optional, one per line)
        </label>
        <Textarea
          value={sources}
          onChange={(e) => setSources(e.target.value)}
          rows={3}
          className="mt-1 font-mono text-xs"
          placeholder="https://example.com/best-practices"
        />
      </div>
      <Button
        onClick={() => run.mutate()}
        disabled={run.isPending || !domainId}
        className="w-full gap-1.5"
      >
        {run.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        Run scan now
      </Button>
    </Card>
  );
}

function WorldWatchTab() {
  const { data: rels = [] } = useQuery({
    queryKey: ["sweetscan", "relationships"],
    queryFn: async () => {
      const { data } = await sb.from("relationships").select("id, name").order("name");
      return data ?? [];
    },
  });

  return (
    <Card className="panel-raised p-4">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-[color:var(--iris-violet)]" />
        <h3 className="text-sm font-semibold">World Watch by client</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Pick a relationship to see its forward radar + everything tagged to that client from
        Capture and external sources.
      </p>
      {rels.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No relationships yet.</p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {(rels as Array<{ id: string; name: string }>).map((r) => (
            <li key={r.id}>
              <Link
                to="/relationships/$id"
                params={{ id: r.id }}
                className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-2 py-1.5 text-xs hover:bg-iris-soft/40"
              >
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="truncate font-medium">{r.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

interface KtiScanRow {
  id: string;
  kti_id: string;
  scanned_at: string;
  observed_value: string | null;
  direction: string;
  fired: boolean;
  kti: { id: string; name: string } | null;
}

interface ProposalRow {
  id: string;
  created_at: string;
  proposed_text: string;
  status: string;
  source_url: string | null;
  domain_id: string | null;
}

function SignalInboxTab() {
  const { data: scans = [] } = useQuery<KtiScanRow[]>({
    queryKey: ["sweetscan", "kti_scans"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("kti_scans")
        .select("id, kti_id, scanned_at, observed_value, direction, fired, kti:key_trend_indicators(id, name)")
        .order("scanned_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as KtiScanRow[];
    },
  });

  const { data: proposals = [] } = useQuery<ProposalRow[]>({
    queryKey: ["sweetscan", "rubric_proposals"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("excellence_checklist_proposals")
        .select("id, created_at, proposed_text, status, source_url, domain_id")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as ProposalRow[];
    },
  });

  const { data: inbound = [] } = useQuery<InboundSignal[]>({
    queryKey: ["sweetscan", "inbound"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("inbound_signals")
        .select(
          "id, source_kind, source_url, summary, classified_kind, classified_subject_type, classified_subject_id, confidence, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as InboundSignal[];
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="panel-raised p-4">
        <header className="mb-3 flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
          <h3 className="text-sm font-semibold">Inbound captures</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">{inbound.length}</span>
        </header>
        {inbound.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nothing inbound yet. Drop articles, podcasts, or transcripts in{" "}
            <Link to="/capture" className="text-[color:var(--iris-violet)] hover:underline">
              Capture
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {inbound.map((s) => (
              <li key={s.id}>
                <SignalTriageItem signal={s} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="panel-raised p-4">
        <header className="mb-3 flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          <h3 className="text-sm font-semibold">KTI scan history</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">{scans.length}</span>
        </header>
        {scans.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No scans yet.</p>
        ) : (
          <ul className="space-y-1">
            {scans.map((s) => (
              <li key={s.id}>
                <Link
                  to="/library/ktis/$id"
                  params={{ id: s.kti_id }}
                  className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 p-2 text-xs hover:bg-iris-soft/40"
                >
                  {s.fired && <Flame className="h-3 w-3 shrink-0 text-amber-500" />}
                  <span className="truncate font-medium">{s.kti?.name ?? "KTI"}</span>
                  {s.observed_value && (
                    <span className="truncate text-muted-foreground">· {s.observed_value}</span>
                  )}
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(s.scanned_at), { addSuffix: true })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="panel-raised p-4">
        <header className="mb-3 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
          <h3 className="text-sm font-semibold">Rubric proposals</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">{proposals.length}</span>
        </header>
        {proposals.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No proposals yet.</p>
        ) : (
          <ul className="space-y-1">
            {proposals.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-0.5 rounded-md border border-border/40 bg-card/40 p-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-1.5 py-0 text-[9px] uppercase tracking-wider text-muted-foreground">
                    {p.status}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </span>
                </div>
                <span className="line-clamp-2 font-medium">{p.proposed_text}</span>
                {p.source_url && (
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[10px] text-[color:var(--iris-violet)] hover:underline"
                  >
                    {p.source_url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/**
 * One row in the SweetScan inbox. Wraps the inbound signal as a Triageable
 * so the same TriageCard gesture works here as in /sandbox, /sparks, /decisions.
 */
function SignalTriageItem({ signal }: { signal: InboundSignal }) {
  const triageable = inboundSignalToTriageable(signal);
  const promote = useTriagePromote();
  return (
    <TriageCard
      item={triageable}
      onPromote={(item, kind) => promote.mutate({ item, kind })}
    />
  );
}
