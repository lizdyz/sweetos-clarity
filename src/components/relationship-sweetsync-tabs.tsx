// Relationship SweetSync tabs — additive view onto a relationship that
// surfaces every entity anchored to it (Missions · Journeys · Quests · Sparks
// · Mirror docs). Filtered by relationship_id; pure read-only for now.

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";
import { Compass, Map as MapIcon, Sparkles, Telescope, BookOpen } from "lucide-react";

interface Props {
  relationshipId: string;
}

export function RelationshipSweetSyncTabs({ relationshipId }: Props) {
  return (
    <section className="px-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">SweetSync</h2>
        <span className="text-[11px] text-muted-foreground">
          Everything anchored to this relationship
        </span>
      </div>
      <Tabs defaultValue="missions">
        <TabsList className="flex w-full justify-start gap-1 overflow-x-auto rounded-xl bg-surface p-1">
          <TabsTrigger value="missions" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Telescope className="h-3 w-3" /> Missions
          </TabsTrigger>
          <TabsTrigger value="journeys" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <MapIcon className="h-3 w-3" /> Journeys
          </TabsTrigger>
          <TabsTrigger value="quests" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Compass className="h-3 w-3" /> Quests
          </TabsTrigger>
          <TabsTrigger value="sparks" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Sparkles className="h-3 w-3" /> Sparks
          </TabsTrigger>
          <TabsTrigger value="mirror" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <BookOpen className="h-3 w-3" /> Mirror
          </TabsTrigger>
        </TabsList>
        <TabsContent value="missions" className="mt-3">
          <MissionsList relationshipId={relationshipId} />
        </TabsContent>
        <TabsContent value="journeys" className="mt-3">
          <JourneysList relationshipId={relationshipId} />
        </TabsContent>
        <TabsContent value="quests" className="mt-3">
          <QuestsList relationshipId={relationshipId} />
        </TabsContent>
        <TabsContent value="sparks" className="mt-3">
          <SparksList relationshipId={relationshipId} />
        </TabsContent>
        <TabsContent value="mirror" className="mt-3">
          <MirrorList relationshipId={relationshipId} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="panel-raised p-6 text-center text-sm text-muted-foreground">
      No {label} anchored to this relationship yet.
    </Card>
  );
}

function MissionsList({ relationshipId }: Props) {
  const { data = [] } = useQuery({
    queryKey: ["sweetsync", "missions", relationshipId],
    queryFn: async () => {
      const { data } = await sb
        .from("missions")
        .select("id, name, status")
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Array<{ id: string; name: string; status: string | null }>;
    },
  });
  if (data.length === 0) return <EmptyState label="missions" />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {data.map((m) => (
        <li key={m.id}>
          <Link
            to="/missions/$id"
            params={{ id: m.id }}
            className="block rounded-xl border border-border bg-card p-3 text-sm transition hover:border-iris/40"
          >
            <div className="font-medium">{m.name}</div>
            {m.status && <Badge variant="outline" className="mt-1 text-[10px]">{m.status}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function JourneysList({ relationshipId }: Props) {
  const { data = [] } = useQuery({
    queryKey: ["sweetsync", "journeys", relationshipId],
    queryFn: async () => {
      const { data } = await sb
        .from("journeys")
        .select("id, name, status")
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Array<{ id: string; name: string; status: string | null }>;
    },
  });
  if (data.length === 0) return <EmptyState label="journeys" />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {data.map((j) => (
        <li key={j.id}>
          <Link
            to="/journeys/$id"
            params={{ id: j.id }}
            className="block rounded-xl border border-border bg-card p-3 text-sm transition hover:border-iris/40"
          >
            <div className="font-medium">{j.name}</div>
            {j.status && <Badge variant="outline" className="mt-1 text-[10px]">{j.status}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function QuestsList({ relationshipId }: Props) {
  const { data = [] } = useQuery({
    queryKey: ["sweetsync", "quests", relationshipId],
    queryFn: async () => {
      const { data } = await sb
        .from("quests")
        .select("id, name, status")
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Array<{ id: string; name: string; status: string | null }>;
    },
  });
  if (data.length === 0) return <EmptyState label="quests" />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {data.map((q) => (
        <li key={q.id}>
          <Link
            to="/quests/$id"
            params={{ id: q.id }}
            className="block rounded-xl border border-border bg-card p-3 text-sm transition hover:border-iris/40"
          >
            <div className="font-medium">{q.name}</div>
            {q.status && <Badge variant="outline" className="mt-1 text-[10px]">{q.status}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SparksList({ relationshipId }: Props) {
  const { data = [] } = useQuery({
    queryKey: ["sweetsync", "sparks", relationshipId],
    queryFn: async () => {
      const { data } = await sb
        .from("sparks" as never)
        .select("id, name, spark_type, done_at")
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as unknown as Array<{ id: string; name: string; spark_type: string | null; done_at: string | null }>;
    },
  });
  if (data.length === 0) return <EmptyState label="sparks" />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((s) => (
        <li key={s.id}>
          <Link
            to="/sparks/$id"
            params={{ id: s.id }}
            className="block rounded-xl border border-border bg-card p-3 text-sm transition hover:border-iris/40"
          >
            <div className="font-medium">{s.name}</div>
            <div className="mt-1 flex items-center gap-1.5">
              {s.spark_type && <Badge variant="outline" className="text-[10px]">{s.spark_type}</Badge>}
              {s.done_at && <Badge className="text-[10px]">done</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MirrorList({ relationshipId }: Props) {
  const { data = [] } = useQuery({
    queryKey: ["sweetsync", "mirror", relationshipId],
    queryFn: async () => {
      const { data } = await sb
        .from("client_mirror_portals")
        .select("id, name, slug, status, last_viewed_at, view_count")
        .eq("relationship_id", relationshipId)
        .order("updated_at", { ascending: false })
        .limit(10);
      return (data ?? []) as Array<{
        id: string; name: string; slug: string; status: string;
        last_viewed_at: string | null; view_count: number;
      }>;
    },
  });
  if (data.length === 0) return <EmptyState label="mirror portals" />;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {data.map((p) => (
        <li key={p.id}>
          <Link
            to="/portals/$relationshipId"
            params={{ relationshipId }}
            className="block rounded-xl border border-border bg-card p-3 text-sm transition hover:border-iris/40"
          >
            <div className="font-medium">{p.name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
              <span>· {p.view_count} views</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
