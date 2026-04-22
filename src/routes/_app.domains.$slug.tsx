import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Compass, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { sb } from "@/lib/sb";
import { ExcellenceMatrix } from "@/components/excellence-matrix";

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

function DomainDetail() {
  const { slug } = Route.useParams();
  const { data: domain, isLoading } = useQuery({
    queryKey: ["domain", slug],
    queryFn: async () => {
      const { data, error } = await sb
        .from("domains")
        .select("id, slug, name, description, color")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Domain | null;
    },
  });

  if (isLoading) {
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

      <header className="mb-6 flex items-start gap-3">
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
      </header>

      <Card className="panel-raised p-5">
        <ExcellenceMatrix
          subjectKind="domain"
          subjectId={domain.id}
          subjectLabel={domain.name}
        />
      </Card>
    </div>
  );
}
