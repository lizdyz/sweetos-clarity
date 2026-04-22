import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { SeedQuestionRenderer, type SeedQuestion } from "@/components/sparkpath/seed-question-renderer";
import "@/styles/sparkpath-public.css";

export const Route = createFileRoute("/p/$slug/seed")({
  component: PublicSeedPage,
  head: () => ({
    meta: [
      { title: "SparkPath — Seed" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Section = {
  id: string;
  code: string;
  name: string;
  preamble_md: string | null;
  sort_order: number;
  questions: SeedQuestion[];
};

function PublicSeedPage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["public-seed", slug],
    queryFn: async () => {
      const { data: seed, error } = await supabase
        .from("client_seeds")
        .select("id, name, status, template_id, preamble_override_md")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!seed) return null;

      const { data: sections } = await supabase
        .from("seed_template_sections")
        .select("id, code, name, preamble_md, sort_order")
        .eq("template_id", seed.template_id)
        .order("sort_order");

      const sectionIds = (sections ?? []).map((s) => s.id);
      const { data: questions } = await supabase
        .from("seed_template_questions")
        .select("id, section_id, code, prompt, hint, question_type, badge, sort_order")
        .in("section_id", sectionIds.length ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
        .order("sort_order");

      const { data: responses } = await supabase
        .from("seed_responses")
        .select("question_id, response_text")
        .eq("client_seed_id", seed.id);

      const responseMap = new Map<string, string>();
      (responses ?? []).forEach((r) => responseMap.set(r.question_id, r.response_text ?? ""));

      const grouped: Section[] = (sections ?? []).map((s) => ({
        ...s,
        questions: (questions ?? [])
          .filter((q) => q.section_id === s.id)
          .map((q) => ({
            id: q.id,
            code: q.code,
            prompt: q.prompt,
            hint: q.hint,
            question_type: q.question_type,
            badge: q.badge,
          })),
      }));

      const totalQ = (questions ?? []).length;
      const answered = (responses ?? []).filter((r) => (r.response_text ?? "").trim().length > 0).length;

      return { seed, sections: grouped, responseMap, totalQ, answered };
    },
  });

  const saveResponse = useMutation({
    mutationFn: async ({ questionId, value }: { questionId: string; value: string }) => {
      if (!data?.seed) return;
      const { error } = await supabase.from("seed_responses").upsert(
        {
          client_seed_id: data.seed.id,
          question_id: questionId,
          response_text: value,
          word_count: value.trim().split(/\s+/).filter(Boolean).length,
          auto_saved_at: new Date().toISOString(),
        },
        { onConflict: "client_seed_id,question_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["public-seed", slug] });
    },
  });

  if (isLoading) {
    return (
      <div className="sparkpath-public">
        <div className="sp-shell"><p className="sp-eyebrow">Loading…</p></div>
      </div>
    );
  }

  if (!data?.seed) {
    return (
      <div className="sparkpath-public">
        <div className="sp-shell">
          <p className="sp-eyebrow">Not Found</p>
          <h1>This SparkPath isn't published.</h1>
          <p>Double-check the link, or reach out to your guide.</p>
        </div>
      </div>
    );
  }

  const pct = data.totalQ ? Math.round((data.answered / data.totalQ) * 100) : 0;

  return (
    <div className="sparkpath-public">
      <nav className="sp-section-nav">
        <span><strong>{data.seed.name}</strong> · Mirror Seed</span>
        <span className="sp-saving">{data.answered}/{data.totalQ} answered · {pct}%</span>
      </nav>
      <div className="sp-shell">
        <p className="sp-eyebrow">SparkPath · Seed</p>
        <h1>{data.seed.name}</h1>
        <div className="sp-progress"><span style={{ width: `${pct}%` }} /></div>

        {data.seed.preamble_override_md && (
          <div className="sp-callout how" style={{ marginTop: "1.6rem" }}>
            {data.seed.preamble_override_md}
          </div>
        )}

        <div className="sp-callout record" style={{ marginTop: "1.4rem" }}>
          <strong>How this works.</strong> Answer what you can, skip what you can't, upload anything that's already
          documented. Every answer auto-saves. Come back as many times as you need.
        </div>

        <hr className="sp-rule" />

        {data.sections.map((s, i) => (
          <section key={s.id}>
            <p className="sp-eyebrow">Section {i + 1} of {data.sections.length}</p>
            <h2>{s.name}</h2>
            {s.preamble_md && <p style={{ color: "var(--ink-soft)" }}>{s.preamble_md}</p>}
            {s.questions.map((q) => (
              <SeedQuestionRenderer
                key={q.id}
                question={q}
                initialValue={data.responseMap.get(q.id) ?? ""}
                onSave={(v) => saveResponse.mutateAsync({ questionId: q.id, value: v })}
              />
            ))}
          </section>
        ))}

        <hr className="sp-rule" />
        <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem", textAlign: "center" }}>
          When you've answered everything you can, your guide will reach out to schedule the next step.
        </p>
      </div>
    </div>
  );
}
