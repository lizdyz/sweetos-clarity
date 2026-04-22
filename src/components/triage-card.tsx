import { useState } from "react";
import { Sparkles, ChevronDown, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  type Triageable,
  type PromoteActionKind,
  DEFAULT_PROMOTE_OPTIONS,
} from "@/lib/triageable";

interface TriageCardProps {
  item: Triageable;
  selected?: boolean;
  onSelect?: (item: Triageable) => void;
  onPromote?: (item: Triageable, kind: PromoteActionKind) => void;
  className?: string;
}

const SOURCE_LABEL: Record<string, string> = {
  capture: "Capture",
  kti_fire: "KTI fire",
  inbound_signal: "Inbound",
  spark: "Spark",
  session_question: "Session Q",
  manual: "Manual",
};

const STATE_TONE: Record<string, string> = {
  raw: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  framed: "bg-iris-soft text-iris",
  routed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  archived: "bg-muted text-muted-foreground",
  active: "bg-iris-soft text-iris",
};

export function TriageCard({ item, selected, onSelect, onPromote, className }: TriageCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const promoteOptions = item.promote_options.length > 0 ? item.promote_options : DEFAULT_PROMOTE_OPTIONS;

  return (
    <div
      onClick={() => onSelect?.(item)}
      className={cn(
        "group cursor-pointer rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        selected && "ring-2 ring-iris ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", STATE_TONE[item.state])}>
            {item.state}
          </span>
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {SOURCE_LABEL[item.source.kind] ?? item.source.kind}
          </span>
          {item.frames.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-iris-soft px-2 py-0.5 text-[10px] font-medium text-iris">
              <Sparkles className="h-2.5 w-2.5" />
              {item.frames.length} {item.frames.length === 1 ? "frame" : "frames"}
            </span>
          )}
        </div>
        {item.created_at && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        )}
      </div>

      <h4 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h4>
      {item.body && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
      )}

      {item.frames.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {item.frames.slice(0, 3).map((f, i) => (
            <span key={i} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {f.overlay_kind}
            </span>
          ))}
        </div>
      )}

      {onPromote && item.state !== "routed" && item.state !== "archived" && (
        <div className="relative mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-iris-soft/50"
          >
            <span>Promote to…</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {menuOpen && (
            <div
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {promoteOptions.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onPromote(item, opt.kind);
                  }}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-iris-soft/50"
                  title={opt.hint}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
