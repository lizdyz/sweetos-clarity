// Server-only ingestion helpers: parsing, signature, classification, schema/object suggestions.
// Pure logic — no I/O. Called from src/utils/ingestion.functions.ts.

export type ParsedStructure = {
  kind: "markdown" | "csv" | "json" | "text" | "unknown";
  headings?: string[];
  frontmatter?: Record<string, string>;
  columns?: string[];
  sampleRows?: string[][];
  jsonKeys?: string[];
  /** Inferred per-key type union across up to 50 sample records (JSON only). */
  jsonSchema?: Record<string, JsonInferredType>;
  /** Coherent nested object keys (JSON only). */
  jsonNestedObjects?: string[];
  /** Array-of-objects keys, candidates for child relationships (JSON only). */
  jsonArrayOfObjects?: string[];
  preview?: string;
  parseError?: string;
};

export type JsonInferredType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "array<object>"
  | "null"
  | "mixed";

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
  conflict_key_fields?: string[];
};

const TEXT_DECODER = new TextDecoder("utf-8");

/** Strip a UTF-8 BOM if present. Real Notion/Excel exports often include one. */
function decode(content: ArrayBuffer | string): string {
  const raw = typeof content === "string" ? content : TEXT_DECODER.decode(content);
  if (raw.charCodeAt(0) === 0xfeff) return raw.slice(1);
  return raw;
}

export function detectExtension(filename: string): string {
  const m = filename.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

export function parseFile(filename: string, content: ArrayBuffer | string): ParsedStructure {
  const ext = detectExtension(filename);
  const text = decode(content);
  if (text.trim().length === 0) {
    return { kind: "unknown", preview: "", parseError: "empty file" };
  }

  if (ext === "md" || ext === "markdown") return parseMarkdown(text);
  if (ext === "csv") return parseCsv(text);
  if (ext === "json") return parseJson(text);
  if (ext === "txt") return { kind: "text", preview: text.slice(0, 200) };
  // Fallback: try to detect from content
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[")) return parseJson(text);
  if (text.includes(",") && text.split("\n").length > 1) return parseCsv(text);
  return { kind: "unknown", preview: text.slice(0, 200) };
}

function parseMarkdown(text: string): ParsedStructure {
  const lines = text.split(/\r?\n/);
  const frontmatter: Record<string, string> = {};
  let bodyStart = 0;

  if (lines[0]?.trim() === "---") {
    let closed = false;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        bodyStart = i + 1;
        closed = true;
        break;
      }
      const m = lines[i].match(/^([A-Za-z0-9_\- ]+)\s*:\s*(.*)$/);
      if (m) frontmatter[m[1].trim().toLowerCase()] = m[2].trim();
    }
    if (!closed) {
      // Frontmatter never closed — treat the whole file as body, drop the partial.
      bodyStart = 0;
      for (const k of Object.keys(frontmatter)) delete frontmatter[k];
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
  if (lines.length === 0) return { kind: "csv", columns: [], sampleRows: [], parseError: "empty csv" };
  const splitRow = (row: string): string[] => {
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
    const records: unknown[] = Array.isArray(obj) ? obj.slice(0, 50) : [obj];
    const schema: Record<string, JsonInferredType> = {};
    const nestedObjects = new Set<string>();
    const arrayOfObjects = new Set<string>();

    for (const rec of records) {
      if (!rec || typeof rec !== "object") continue;
      for (const [k, v] of Object.entries(rec as Record<string, unknown>)) {
        const t = inferJsonType(v);
        if (t === "object") nestedObjects.add(k);
        if (t === "array<object>") arrayOfObjects.add(k);
        if (!(k in schema)) {
          schema[k] = t;
        } else if (schema[k] !== t && t !== "null" && schema[k] !== "null") {
          schema[k] = "mixed";
        } else if (schema[k] === "null") {
          schema[k] = t;
        }
      }
    }

    const keys = Object.keys(schema);
    return {
      kind: "json",
      jsonKeys: keys,
      jsonSchema: schema,
      jsonNestedObjects: Array.from(nestedObjects),
      jsonArrayOfObjects: Array.from(arrayOfObjects),
      preview: text.slice(0, 200),
    };
  } catch (e) {
    return { kind: "unknown", preview: text.slice(0, 200), parseError: `invalid JSON: ${String(e).slice(0, 120)}` };
  }
}

function inferJsonType(v: unknown): JsonInferredType {
  if (v === null) return "null";
  if (Array.isArray(v)) {
    if (v.length > 0 && v.every((x) => x !== null && typeof x === "object" && !Array.isArray(x))) {
      return "array<object>";
    }
    return "array";
  }
  if (typeof v === "object") return "object";
  if (typeof v === "string") return "string";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  return "mixed";
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
  void matched; void unmatched; // declared for parity

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

/** Damerau-style Levenshtein distance, capped at 4 for speed. */
export function editDistance(a: string, b: string, max = 4): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = dp[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j - 1], dp[j]);
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > max) return max + 1;
  }
  return dp[b.length];
}

/** Find the closest existing column name on a target table within edit distance. */
export function findLikelyAlias(
  candidate: string,
  existingColumns: string[],
  maxDist = 2,
): string | null {
  const c = candidate.toLowerCase();
  let best: { col: string; d: number } | null = null;
  for (const col of existingColumns) {
    const d = editDistance(c, col.toLowerCase(), maxDist);
    if (d <= maxDist && (!best || d < best.d)) best = { col, d };
  }
  return best ? best.col : null;
}
