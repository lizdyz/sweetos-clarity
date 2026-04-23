// Renders the entity-canon knowledge graph as a Mermaid diagram.
// Reads `parent_kinds` / `child_kinds` from every canon row and emits edges.

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "@/lib/theme";

interface CanonNode {
  entity_kind: string;
  display_name: string;
  parent_kinds: string[] | null;
  child_kinds: string[] | null;
  peer_kinds: string[] | null;
}

interface Props {
  nodes: CanonNode[];
  onSelect?: (entityKind: string) => void;
}

let renderCounter = 0;

export function EntityCanonGraph({ nodes, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      flowchart: { curve: "basis", padding: 12 },
    });
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Build the diagram
    const lines: string[] = ["graph TD"];
    const seen = new Set<string>();
    const safe = (k: string) => k.replace(/[^a-z0-9_]/gi, "_");
    const known = new Set(nodes.map((n) => n.entity_kind));

    // Define nodes
    for (const n of nodes) {
      lines.push(`  ${safe(n.entity_kind)}["${n.display_name}"]`);
    }
    // Parent → child edges (declared from either side, dedup)
    for (const n of nodes) {
      for (const child of n.child_kinds ?? []) {
        if (!known.has(child)) continue;
        const key = `${n.entity_kind}->${child}`;
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push(`  ${safe(n.entity_kind)} --> ${safe(child)}`);
      }
      for (const parent of n.parent_kinds ?? []) {
        if (!known.has(parent)) continue;
        const key = `${parent}->${n.entity_kind}`;
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push(`  ${safe(parent)} --> ${safe(n.entity_kind)}`);
      }
      // Peer (dotted)
      for (const peer of n.peer_kinds ?? []) {
        if (!known.has(peer)) continue;
        const a = n.entity_kind < peer ? n.entity_kind : peer;
        const b = n.entity_kind < peer ? peer : n.entity_kind;
        const key = `${a}~${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push(`  ${safe(a)} -.- ${safe(b)}`);
      }
    }
    // Click handlers
    if (onSelect) {
      for (const n of nodes) {
        lines.push(`  click ${safe(n.entity_kind)} canonClick_${safe(n.entity_kind)}`);
      }
    }

    const source = lines.join("\n");
    const id = `canon-graph-${++renderCounter}`;

    mermaid
      .render(id, source)
      .then(({ svg, bindFunctions }) => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = svg;
        // Wire click via delegation since mermaid click is fiddly
        if (onSelect) {
          containerRef.current.querySelectorAll<SVGGElement>("g.node").forEach((g) => {
            const id = g.id || "";
            const m = id.match(/flowchart-([a-z0-9_]+)-/i);
            if (!m) return;
            const kind = m[1];
            g.style.cursor = "pointer";
            g.addEventListener("click", () => onSelect(kind));
          });
        }
        bindFunctions?.(containerRef.current);
        setError(null);
      })
      .catch((e: Error) => {
        console.error("Mermaid render failed", e);
        setError(e.message);
      });
  }, [nodes, theme, onSelect]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No canon entities yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4">
      {error && (
        <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          Graph render failed: {error}
        </div>
      )}
      <div ref={containerRef} className="overflow-auto [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-w-full" />
      <p className="mt-3 text-[11px] text-muted-foreground">
        Solid arrow = parent → child. Dotted = peer. Click a node to open its canon.
      </p>
    </div>
  );
}
