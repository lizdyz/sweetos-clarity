import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Compass, Loader2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sb } from "@/lib/sb";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/domains/$slug")({
  component: DomainDetail,
});

interface Domain {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
}
interface Tenet {
  id: string;
  domain_id: string;
  name: string;
  description: string | null;
  excellence_definition: string | null;
  sort_order: number;
}
interface RubricItem {
  id: string;
  tenet_id: string;
  prompt: string;
  excellence_definition: string | null;
  scale_min: number;
  scale_max: number;
  sort_order: number;
}
interface RubricScore {
  id: string;
  rubric_item_id: string;
  score: number | null;
  notes: string | null;
}
interface Relationship {
  id: string;
  name: string;
}

function scoreColor(score: number | null, max: number): string {
  if (score === null || score === undefined) return "oklch(0.85 0.01 280)";
  const ratio = score / max;
  if (ratio >= 0.8) return "oklch(0.72 0.16 150)";
  if (ratio >= 0.5) return "oklch(0.78 0.16 80)";
  return "oklch(0.70 0.18 25)";
}

function DomainDetail() {
  const { slug } = Route.useParams();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [tenets, setTenets] = useState<Tenet[]>([]);
  const [items, setItems] = useState<RubricItem[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [activeRel, setActiveRel] = useState<string>("");
  const [scores, setScores] = useState<Record<string, RubricScore>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: d } = await sb.from("domains").select("*").eq("slug", slug).maybeSingle();
      if (!d) {
        setLoading(false);
        return;
      }
      const dom = d as Domain;
      setDomain(dom);
      const { data: ts } = await sb
        .from("tenets")
        .select("*")
        .eq("domain_id", dom.id)
        .eq("enabled", true)
        .order("sort_order");
      const tList = (ts as Tenet[]) ?? [];
      setTenets(tList);
      if (tList.length) {
        const { data: ri } = await sb
          .from("rubric_items")
          .select("*")
          .in(
            "tenet_id",
            tList.map((t) => t.id),
          )
          .eq("enabled", true)
          .order("sort_order");
        setItems((ri as RubricItem[]) ?? []);
      }
      const { data: rels } = await sb
        .from("relationships")
        .select("id, name")
        .order("name");
      setRelationships((rels as Relationship[]) ?? []);
      setLoading(false);
    })();
  }, [slug]);

  // load scores when relationship changes
  useEffect(() => {
    (async () => {
      if (!activeRel || !items.length) {
        setScores({});
        return;
      }
      const { data } = await sb
        .from("rubric_scores")
        .select("id, rubric_item_id, score, notes")
        .eq("relationship_id", activeRel)
        .in(
          "rubric_item_id",
          items.map((i) => i.id),
        );
      const map: Record<string, RubricScore> = {};
      ((data as RubricScore[]) ?? []).forEach((s) => {
        map[s.rubric_item_id] = s;
      });
      setScores(map);
    })();
  }, [activeRel, items]);

  const itemsByTenet = useMemo(() => {
    const m: Record<string, RubricItem[]> = {};
    items.forEach((i) => {
      m[i.tenet_id] = m[i.tenet_id] ?? [];
      m[i.tenet_id].push(i);
    });
    return m;
  }, [items]);

  const tenetAvg = useMemo(() => {
    const m: Record<string, { avg: number | null; max: number }> = {};
    tenets.forEach((t) => {
      const list = itemsByTenet[t.id] ?? [];
      const max = list[0]?.scale_max ?? 5;
      const present = list
        .map((i) => scores[i.id]?.score)
        .filter((v): v is number => v !== null && v !== undefined);
      m[t.id] = {
        avg: present.length ? present.reduce((a, b) => a + b, 0) / present.length : null,
        max,
      };
    });
    return m;
  }, [tenets, itemsByTenet, scores]);

  async function saveScore(item: RubricItem, value: number | null, notes?: string) {
    if (!activeRel) {
      toast.error("Pick a relationship first");
      return;
    }
    setSavingId(item.id);
    const existing = scores[item.id];
    const payload = {
      relationship_id: activeRel,
      rubric_item_id: item.id,
      score: value,
      notes: notes ?? existing?.notes ?? null,
      assessed_at: new Date().toISOString(),
    };
    if (existing) {
      const { error } = await sb
        .from("rubric_scores")
        .update(payload)
        .eq("id", existing.id);
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await sb
        .from("rubric_scores")
        .insert(payload)
        .select("id, rubric_item_id, score, notes")
        .single();
      if (error) toast.error(error.message);
      else if (data)
        setScores((prev) => ({ ...prev, [item.id]: data as RubricScore }));
    }
    if (value !== null || notes !== undefined) {
      setScores((prev) => ({
        ...prev,
        [item.id]: {
          ...(prev[item.id] ?? { id: "", rubric_item_id: item.id }),
          score: value,
          notes: notes ?? prev[item.id]?.notes ?? null,
        } as RubricScore,
      }));
    }
    setSavingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="px-6 py-6">
        <p className="text-muted-foreground">Domain not found.</p>
        <Link to="/domains" className="text-sm text-[color:var(--iris-violet)]">
          ← Back to domains
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <Link
        to="/domains"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All domains
      </Link>

      <header className="mb-6 flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-[var(--shadow-glass)]"
            style={{ background: domain.color }}
          >
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{domain.name}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{domain.description}</p>
          </div>
        </div>
        <div className="min-w-[220px]">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assessing for
          </label>
          <Select value={activeRel} onValueChange={setActiveRel}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a relationship" />
            </SelectTrigger>
            <SelectContent>
              {relationships.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="space-y-5">
        {tenets.map((t) => {
          const avg = tenetAvg[t.id];
          const list = itemsByTenet[t.id] ?? [];
          return (
            <Card key={t.id} className="border-border/60 bg-surface-raised/80 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{t.name}</h3>
                  {t.excellence_definition && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80">Excellent looks like:</span>{" "}
                      {t.excellence_definition}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-9 w-12 place-items-center rounded-lg text-sm font-bold text-white"
                    style={{ background: scoreColor(avg.avg, avg.max) }}
                  >
                    {avg.avg !== null ? avg.avg.toFixed(1) : "—"}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    /{avg.max}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {list.map((i) => {
                  const s = scores[i.id];
                  return (
                    <div
                      key={i.id}
                      className="rounded-xl border border-border/50 bg-surface/60 p-3"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{i.prompt}</p>
                          {i.excellence_definition && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              ✓ {i.excellence_definition}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: i.scale_max - i.scale_min + 1 }, (_, idx) => {
                            const v = i.scale_min + idx;
                            const selected = s?.score === v;
                            return (
                              <button
                                key={v}
                                disabled={!activeRel || savingId === i.id}
                                onClick={() => saveScore(i, v)}
                                className={`grid h-7 w-7 place-items-center rounded-md text-xs font-semibold transition-all ${
                                  selected
                                    ? "text-white shadow"
                                    : "border border-border/60 bg-surface text-muted-foreground hover:bg-muted"
                                }`}
                                style={
                                  selected
                                    ? { background: scoreColor(v, i.scale_max) }
                                    : undefined
                                }
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <Textarea
                        placeholder="Notes (optional) — what's true today?"
                        defaultValue={s?.notes ?? ""}
                        disabled={!activeRel}
                        onBlur={(e) => {
                          if (e.target.value !== (s?.notes ?? "")) {
                            saveScore(i, s?.score ?? null, e.target.value);
                          }
                        }}
                        className="min-h-[40px] resize-y text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {!activeRel && (
        <Card className="mt-6 border-dashed border-border/60 bg-surface/40 p-4 text-center text-xs text-muted-foreground">
          Pick a relationship above to begin scoring this domain.
        </Card>
      )}
    </div>
  );
}
