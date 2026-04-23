// Sample fixture batch used by the "Test with sample batch" button on /import.
// Six small text-based files cover the full classifier behaviour: components,
// journeys, prompts, plain text, and CSVs (one structured for components,
// one ambiguous to exercise the needs_review fallback).

export type SampleFile = {
  filename: string;
  mime: string;
  content: string;
};

const componentMd1 = `---
name: Auth Service
domain: Identity
maturity: L3 Launching
owner: Liz
---

# Auth Service

## Inputs
- Customer email
- Provider tokens (Google, GitHub)

## Outputs
- Signed session JWT
- Audit log row

## Notes
Owns the sign-in surface and session refresh.
`;

const componentMd2 = `---
name: Onboarding Wizard
domain: Activation
maturity: L2 Learning
owner: Liz
---

# Onboarding Wizard

## Inputs
- New account
- Welcome template

## Outputs
- Configured workspace
- First-run telemetry
`;

const journeyMd = `---
stage: Discovery
owner: Liz
status: Active
---

# Series A Diligence Journey

The path a Series A prospect walks from first call through term sheet.
`;

const promptMd = `# Distill Brand Canon

Prompt: You are a brand strategist. Read the supplied notes and produce a single page of brand canon.

Variables:
- {{notes}}
- {{tone}}

## Notes
Keep tone calm and operator-grade.
`;

const componentsCsv = `name,description,domain,maturity
Billing Engine,Handles invoicing and dunning,Revenue,L3 Launching
Lead Router,Routes inbound to the right pod,Sales,L4 Leveraging
Insight Composer,Drafts weekly insight digests,Intelligence,L2 Learning
`;

const ambiguousCsv = `column_a,column_b,column_c
foo,bar,baz
qux,quux,corge
`;

const plainTxt = `Quick thought: we should be tracking signal-to-noise on inbound demos.
Most of what comes through is unscored. Worth a KTI on conversion-by-source.
`;

const promptJson = `{
  "name": "ux-audit",
  "model": "google/gemini-2.5-flash",
  "system": "You audit UX flows for clarity, hierarchy, and friction.",
  "variables": ["screenshot", "context"],
  "output_kind": "audit_report"
}
`;

export const SAMPLE_BATCH: SampleFile[] = [
  { filename: "components/auth-service.md", mime: "text/markdown", content: componentMd1 },
  { filename: "components/onboarding-wizard.md", mime: "text/markdown", content: componentMd2 },
  { filename: "journeys/series-a-diligence.md", mime: "text/markdown", content: journeyMd },
  { filename: "prompts/distill-brand-canon.md", mime: "text/markdown", content: promptMd },
  { filename: "tables/components.csv", mime: "text/csv", content: componentsCsv },
  { filename: "tables/ambiguous.csv", mime: "text/csv", content: ambiguousCsv },
  { filename: "notes/signal-to-noise.txt", mime: "text/plain", content: plainTxt },
  { filename: "prompts/ux-audit.json", mime: "application/json", content: promptJson },
];

export function sampleBatchAsFiles(): File[] {
  return SAMPLE_BATCH.map(
    (f) => new File([f.content], f.filename.split("/").pop() ?? f.filename, { type: f.mime }),
  );
}

export function sampleBatchSourcePathFor(filename: string): string | null {
  const hit = SAMPLE_BATCH.find((s) => (s.filename.split("/").pop() ?? s.filename) === filename);
  return hit ? hit.filename : null;
}
