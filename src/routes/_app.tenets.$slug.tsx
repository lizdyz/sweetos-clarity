import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sb } from "@/lib/sb";
import { ExcellenceMatrix } from "@/components/excellence-matrix";

export const Route = createFileRoute("/_app/tenets/$slug")({
  component: TenetDetail,
});

interface Tenet {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  industry_id: string | null;
  industries?: { name: string; slug: string } | null;
}

function TenetDetail() {
  const { slug } = Route.useParams();
  const { data: tenet, isLoading } = useQuery({
    queryKey: ["tenet", slug],
    queryFn: async () => {
      const { data, error } = await sb
        .from("tenets")
        .select("id, slug, name, description, category, industry_id, industries (name, slug)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Tenet | null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!tenet) {
    return (
      <div className="px-6 py-6">
        <p className="text-muted-foreground">Tenet not found.</p>
        <Link to="/settings/excellence" className="text-sm text-[color:var(--iris-violet)]">
          ← Manage tenets
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <Link
        to="/settings/excellence"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All tenets
      </Link>

      <header className="mb-6 flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-iris text-white shadow-[var(--shadow-glow)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{tenet.name}</h1>
            {tenet.category && <Badge variant="outline">{tenet.category}</Badge>}
            {tenet.industries?.name && (
              <Badge variant="secondary">{tenet.industries.name}</Badge>
            )}
            {!tenet.industry_id && <Badge variant="secondary">Universal</Badge>}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{tenet.description}</p>
        </div>
      </header>

      <Card className="panel-raised p-5">
        <ExcellenceMatrix
          subjectKind="tenet"
          subjectId={tenet.id}
          subjectLabel={tenet.name}
        />
      </Card>
    </div>
  );
}
