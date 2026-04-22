import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sb as supabase } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ExternalLink, Copy } from "lucide-react";

export const Route = createFileRoute("/_app/relationships/$id/sparkpath")({
  component: SparkPathOverview,
});

type Template = { id: string; slug: string; name: string; kind: string };
type ClientSeed = {
  id: string;
  slug: string;
  name: string;
  status: string;
  template_id: string | null;
  view_count: number;
  published_at: string | null;
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function SparkPathOverview() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [seedName, setSeedName] = useState("Mirror Seed");
  const [templateId, setTemplateId] = useState<string>("");

  const { data: rel } = useQuery({
    queryKey: ["rel-name", id],
    queryFn: async () => {
      const { data } = await supabase.from("relationships").select("name").eq("id", id).maybeSingle();
      return data as { name: string } | null;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["seed-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seed_templates")
        .select("id, slug, name, kind")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const { data: seeds = [] } = useQuery({
    queryKey: ["client-seeds", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_seeds")
        .select("id, slug, name, status, template_id, view_count, published_at")
        .eq("relationship_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientSeed[];
    },
  });

  const createSeed = useMutation({
    mutationFn: async () => {
      if (!templateId) throw new Error("Pick a template");
      const baseSlug = `${slugify(rel?.name ?? "client")}-${slugify(seedName)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("client_seeds").insert({
        relationship_id: id,
        template_id: templateId,
        slug: baseSlug,
        name: seedName,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Seed created");
      qc.invalidateQueries({ queryKey: ["client-seeds", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishToggle = useMutation({
    mutationFn: async (seed: ClientSeed) => {
      const next = seed.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("client_seeds")
        .update({
          status: next,
          published_at: next === "published" ? new Date().toISOString() : null,
        })
        .eq("id", seed.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-seeds", id] }),
  });

  const publicUrl = (slug: string) => `${window.location.origin}/p/${slug}/seed`;

  return (
    <div className="space-y-6 p-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">SparkPath</p>
        <h1 className="text-2xl font-semibold">{rel?.name ?? "Relationship"} — Publication Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Author and publish the four client-facing artifacts: Primer, Seed, Mirror Portal, Clarity.
        </p>
      </header>

      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-medium">Create a new Seed</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Seed name</Label>
            <Input value={seedName} onChange={(e) => setSeedName(e.target.value)} />
          </div>
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Pick a template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => createSeed.mutate()} disabled={!templateId}>Create draft</Button>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Seeds</h2>
        {seeds.length === 0 && (
          <p className="text-sm text-muted-foreground">No seeds yet — create one above.</p>
        )}
        {seeds.map((s) => (
          <Card key={s.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground font-mono">/p/{s.slug}/seed · {s.status} · {s.view_count} views</p>
            </div>
            <div className="flex items-center gap-2">
              {s.status === "published" && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => {
                    navigator.clipboard.writeText(publicUrl(s.slug));
                    toast.success("Public URL copied");
                  }}>
                    <Copy className="h-4 w-4 mr-1" /> Copy link
                  </Button>
                  <a href={`/p/${s.slug}/seed`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink className="h-4 w-4 mr-1" /> Open</Button>
                  </a>
                </>
              )}
              <Button size="sm" onClick={() => publishToggle.mutate(s)}>
                {s.status === "published" ? "Unpublish" : "Publish"}
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <Card className="p-5">
        <h2 className="text-lg font-medium mb-2">Coming next (Phase B + C)</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>· Primer authoring with AI hook draft</li>
          <li>· Mirror Portal section editor with per-section AI assist</li>
          <li>· Clarity doc + Spark watcher (responses → Sparks)</li>
        </ul>
        <p className="text-xs mt-3"><Link to="/relationships/$id" params={{ id }} className="underline">← back to relationship</Link></p>
      </Card>
    </div>
  );
}
