import { useQuery } from "@tanstack/react-query";
import { Users, Target, Eye, Compass, Sparkles } from "lucide-react";
import { sb } from "@/lib/sb";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

interface Props {
  matched_personas?: string[];
  matched_jtbds?: string[];
  matched_quests?: string[];
  matched_sparks?: string[];
  matched_ktis?: string[];
  suggested_kti_payload?: { suggested?: boolean; name?: string; what_to_watch?: string } | null;
}

export function CapturePollinationChips(p: Props) {
  const personas = p.matched_personas ?? [];
  const jtbds = p.matched_jtbds ?? [];
  const quests = p.matched_quests ?? [];
  const sparks = p.matched_sparks ?? [];
  const ktis = p.matched_ktis ?? [];
  const ktiSuggestion = p.suggested_kti_payload?.suggested ? p.suggested_kti_payload : null;

  const hasAny =
    personas.length || jtbds.length || quests.length || sparks.length || ktis.length || ktiSuggestion;
  if (!hasAny) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-surface/40 p-2.5">
      {personas.length > 0 && <PersonaRow ids={personas} />}
      {jtbds.length > 0 && <JTBDRow ids={jtbds} />}
      {ktis.length > 0 && <KTIRow ids={ktis} />}
      {(quests.length > 0 || sparks.length > 0) && (
        <ActiveWorkRow questIds={quests} sparkIds={sparks} />
      )}
      {ktiSuggestion && <KTISuggestionChip suggestion={ktiSuggestion} />}
    </div>
  );
}

function ChipRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      {children}
    </div>
  );
}

function PersonaRow({ ids }: { ids: string[] }) {
  const { data = [] } = useQuery({
    queryKey: ["pollination-personas", ids.join(",")],
    queryFn: async () => {
      const { data } = await sb.from("personas").select("id, name").in("id", ids);
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
  return (
    <ChipRow icon={Users} label="Personas">
      {data.map((p) => (
        <Link key={p.id} to="/personas/$id" params={{ id: p.id }}>
          <Badge variant="secondary" className="cursor-pointer hover:bg-iris-soft">
            {p.name}
          </Badge>
        </Link>
      ))}
    </ChipRow>
  );
}

function JTBDRow({ ids }: { ids: string[] }) {
  const { data = [] } = useQuery({
    queryKey: ["pollination-jtbds", ids.join(",")],
    queryFn: async () => {
      const { data } = await sb.from("jobs_to_be_done").select("id, statement").in("id", ids);
      return (data ?? []) as Array<{ id: string; statement: string }>;
    },
  });
  return (
    <ChipRow icon={Target} label="JTBDs advanced">
      {data.map((j) => (
        <Link key={j.id} to="/library/jtbd/$id" params={{ id: j.id }}>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            {j.statement.length > 40 ? j.statement.slice(0, 40) + "…" : j.statement}
          </Badge>
        </Link>
      ))}
    </ChipRow>
  );
}

function KTIRow({ ids }: { ids: string[] }) {
  const { data = [] } = useQuery({
    queryKey: ["pollination-ktis", ids.join(",")],
    queryFn: async () => {
      const { data } = await sb.from("key_trend_indicators").select("id, name").in("id", ids);
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
  return (
    <ChipRow icon={Eye} label="Watch matches">
      {data.map((k) => (
        <Badge key={k.id} variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
          {k.name}
        </Badge>
      ))}
    </ChipRow>
  );
}

function ActiveWorkRow({ questIds, sparkIds }: { questIds: string[]; sparkIds: string[] }) {
  const { data: quests = [] } = useQuery({
    queryKey: ["pollination-quests", questIds.join(",")],
    queryFn: async () => {
      if (!questIds.length) return [];
      const { data } = await sb.from("quests").select("id, name").in("id", questIds);
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
    enabled: questIds.length > 0,
  });
  const { data: sparks = [] } = useQuery({
    queryKey: ["pollination-sparks", sparkIds.join(",")],
    queryFn: async () => {
      if (!sparkIds.length) return [];
      const { data } = await sb.from("sparks").select("id, name").in("id", sparkIds);
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
    enabled: sparkIds.length > 0,
  });
  return (
    <ChipRow icon={Compass} label="Active work">
      {quests.map((q) => (
        <Link key={q.id} to="/quests/$id" params={{ id: q.id }}>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Quest: {q.name}
          </Badge>
        </Link>
      ))}
      {sparks.map((s) => (
        <Link key={s.id} to="/sparks/$id" params={{ id: s.id }}>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Spark: {s.name}
          </Badge>
        </Link>
      ))}
    </ChipRow>
  );
}

function KTISuggestionChip({
  suggestion,
}: {
  suggestion: { name?: string; what_to_watch?: string };
}) {
  return (
    <div className="flex items-start gap-1.5 rounded-md border border-iris/40 bg-iris-soft/30 p-2">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 text-[color:var(--iris-violet)]" />
      <div className="flex-1 text-[11px]">
        <div className="font-semibold">Suggested KTI to watch: {suggestion.name}</div>
        {suggestion.what_to_watch && (
          <div className="text-muted-foreground">{suggestion.what_to_watch}</div>
        )}
      </div>
    </div>
  );
}
