// Server-only ingestion helpers: parsing, signature, classification, schema/object suggestions.
// Pure logic — no I/O. Called from src/utils/ingestion.functions.ts.

export type ParsedStructure = {
  kind: "markdown" | "csv" | "json" | "text" | "unknown";
  headings?: string[];
  frontmatter?: Record<string, string>;
  columns?: string[];
  sampleRows?: string[][];
  jsonKeys?: string[];
  preview?: string;
};

export type ClassificationProposal = {
  object_type: string | null;
  target_table: string | null;
  confidence: number; // 0..1
  rationale: string;
  matched_fields: string[];
  unmatched_fields: string[];
};

export type RegistryEntry = {
  object_type: string;
  display_name: string;
  target_table: string;
  required_fields: string[];
  optional_fields: string[];
};

const TEXT_DECODER = new TextDecoder();

export function detectExtension(filename: string): string {
  const m = filename.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

export function parseFile(filename: string, content: ArrayBuffer | string): ParsedStructure {
  const ext = detectExtension(filename);
  const text = typeof content === "string" ? content : TEXT_DECODER.decode(content);

  if (ext === "md" || ext === "markdown") return parseMarkdown(text);
  if (ext === "csv") return parseCsv(text);
  if (ext === "json") return parseJson(text);
  if (ext === "txt") return { kind: "text", preview: text.slice(0, 200) };
  // Fallback: try to detect from content
  if (text.trim().startsWith("{") || text.trim().startsWith("[")) return parseJson(text);
  if (text.includes(",") && text.split("\n").length > 1) return parseCsv(text);
  return { kind: "unknown", preview: text.slice(0, 200) };
}

function parseMarkdown(text: string): ParsedStructure {
  const lines = text.split(/\r?\n/);
  const frontmatter: Record<string, string> = {};
  let bodyStart = 0;

  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        bodyStart = i + 1;
        break;
      }
      const m = lines[i].match(/^([A-Za-z0-9_\- ]+)\s*:\s*(.*)$/);
      if (m) frontmatter[m[1].trim().toLowerCase()] = m[2].trim();
    }
  }

  const headings: string[] = [];
  for (let i = bodyStart; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (m) headings.push(`${"#".repeat(m[1].length)} ${m[2].trim()}`);
  }

  return {
    kind: "markdown",
    frontmatter,
    headings,
    preview: text.slice(0, 200),
  };
}

function parseCsv(text: string): ParsedStructure {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { kind: "csv", columns: [], sampleRows: [] };
  const splitRow = (row: string): string[] => {
    // Minimal CSV splitter; handles simple quoted fields.
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (inQ) {
        if (c === '"' && row[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const columns = splitRow(lines[0]).map((c) => c.toLowerCase());
  const sampleRows = lines.slice(1, 6).map(splitRow);
  return { kind: "csv", columns, sampleRows, preview: lines.slice(0, 3).join("\n").slice(0, 200) };
}

function parseJson(text: string): ParsedStructure {
  try {
    const obj = JSON.parse(text);
    const top = Array.isArray(obj) ? (obj[0] ?? {}) : obj;
    const keys = top && typeof top === "object" ? Object.keys(top) : [];
    return { kind: "json", jsonKeys: keys, preview: text.slice(0, 200) };
  } catch {
    return { kind: "unknown", preview: text.slice(0, 200) };
  }
}

/** Stable signature for grouping files that look the same. */
export function signatureFor(s: ParsedStructure, ext: string): string {
  if (s.kind === "csv" && s.columns?.length) {
    return `csv:${[...s.columns].sort().join("|")}`;
  }
  if (s.kind === "markdown") {
    const headingShape = (s.headings ?? []).map((h) => h.replace(/[A-Za-z].*/, (m) => m.split(" ")[0])).slice(0, 12).join(",");
    const fmKeys = Object.keys(s.frontmatter ?? {}).sort().join(",");
    return `md:${fmKeys}::${headingShape}`;
  }
  if (s.kind === "json") return `json:${(s.jsonKeys ?? []).sort().join("|")}`;
  return `${s.kind}:${ext}`;
}

/** Deterministic classifier. Returns null object_type when nothing matches. */
export function classifyGroup(
  s: ParsedStructure,
  registry: RegistryEntry[],
  aliases: Map<string, { target_object_type: string | null; target_table: string | null }>,
): ClassificationProposal {
  const fields = collectFields(s);
  const matched: string[] = [];
  const unmatched: string[] = [];

  // 1) Try strong rule patterns
  if (s.kind === "markdown") {
    const fm = s.frontmatter ?? {};
    const hs = (s.headings ?? []).map((h) => h.toLowerCase());
    const has = (label: string) => hs.some((h) => h.includes(label));

    if ("stage" in fm && "owner" in fm) {
      return ruleHit("journey", "journeys", 0.85, 'Frontmatter has "stage" + "owner"', fields, registry);
    }
    if (has("inputs") && has("outputs")) {
      return ruleHit("component", "components", 0.85, "H1 + ## Inputs + ## Outputs", fields, registry);
    }
    if (has("prompt") && has("variables")) {
      return ruleHit("document", "documents", 0.75, "Prompt + Variables headings", fields, registry);
    }
    if (has("decision") || has("rationale")) {
      return ruleHit("decision", "decisions", 0.7, "Decision/Rationale heading", fields, registry);
    }
  }

  if (s.kind === "csv" && s.columns) {
    const cols = new Set(s.columns);
    if (["name","description","domain","maturity"].every((c) => cols.has(c))) {
      return ruleHit("component", "components", 0.9, "Columns: name, description, domain, maturity", fields, registry);
    }
    if (["from","to","kind"].every((c) => cols.has(c))) {
      return ruleHit("relationship", "relationships", 0.7, "Columns: from, to, kind", fields, registry);
    }
    if (cols.has("campaign_name") || cols.has("goal")) {
      return ruleHit("campaign", "campaigns", 0.7, "Campaign columns", fields, registry);
    }
    if (cols.has("decision")) {
      return ruleHit("decision", "decisions", 0.7, "Decision column", fields, registry);
    }
  }

  // 2) Alias-based — check learned rules
  for (const f of fields) {
    const hit = aliases.get(f.toLowerCase());
    if (hit?.target_object_type) {
      const r = registry.find((r) => r.object_type === hit.target_object_type);
      if (r) {
        const { matched: mf, unmatched: uf } = matchAgainstRegistry(fields, r);
        return {
          object_type: r.object_type,
          target_table: r.target_table,
          confidence: 0.6,
          rationale: `Matched saved rule for "${f}"`,
          matched_fields: mf,
          unmatched_fields: uf,
        };
      }
    }
  }

  // 3) Field-overlap scoring — best registry match if any
  let best: { entry: RegistryEntry; score: number; matched: string[]; unmatched: string[] } | null = null;
  for (const entry of registry) {
    const { matched: mf, unmatched: uf } = matchAgainstRegistry(fields, entry);
    const reqHit = entry.required_fields.filter((r) => fields.includes(r)).length;
    const score = reqHit / Math.max(entry.required_fields.length, 1) * 0.6 + (mf.length / Math.max(fields.length, 1)) * 0.4;
    if (!best || score > best.score) best = { entry, score, matched: mf, unmatched: uf };
  }

  if (best && best.score >= 0.5) {
    return {
      object_type: best.entry.object_type,
      target_table: best.entry.target_table,
      confidence: Math.min(0.7, best.score),
      rationale: `Field overlap with ${best.entry.display_name}`,
      matched_fields: best.matched,
      unmatched_fields: best.unmatched,
    };
  }

  // 4) Unknown — never force-fit
  return {
    object_type: null,
    target_table: null,
    confidence: 0,
    rationale: "No rule matched — needs review",
    matched_fields: [],
    unmatched_fields: fields,
  };
}

function ruleHit(
  type: string, table: string, confidence: number, rationale: string,
  fields: string[], registry: RegistryEntry[],
): ClassificationProposal {
  const entry = registry.find((r) => r.object_type === type);
  const { matched, unmatched } = entry ? matchAgainstRegistry(fields, entry) : { matched: [], unmatched: fields };
  return { object_type: type, target_table: table, confidence, rationale, matched_fields: matched, unmatched_fields: unmatched };
}

function collectFields(s: ParsedStructure): string[] {
  if (s.kind === "csv") return s.columns ?? [];
  if (s.kind === "json") return (s.jsonKeys ?? []).map((k) => k.toLowerCase());
  if (s.kind === "markdown") return Object.keys(s.frontmatter ?? {}).map((k) => k.toLowerCase());
  return [];
}

function matchAgainstRegistry(fields: string[], entry: RegistryEntry) {
  const known = new Set([...entry.required_fields, ...entry.optional_fields].map((f) => f.toLowerCase()));
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const f of fields) (known.has(f.toLowerCase()) ? matched : unmatched).push(f);
  return { matched, unmatched };
}

/** Guess a SQL-ish field type from sample values. */
export function guessFieldType(samples: string[]): string {
  const vals = samples.filter((s) => s != null && s !== "");
  if (vals.length === 0) return "text";
  if (vals.every((v) => /^-?\d+(\.\d+)?$/.test(v))) return "number";
  if (vals.every((v) => /^(true|false|yes|no)$/i.test(v))) return "boolean";
  if (vals.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) return "date";
  const distinct = new Set(vals.map((v) => v.toLowerCase()));
  if (distinct.size <= Math.max(3, Math.floor(vals.length / 4))) return "enum";
  return "text";
}
