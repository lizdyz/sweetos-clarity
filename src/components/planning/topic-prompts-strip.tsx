// Single collapsible "Prompts" strip — replaces stack of prompt cards.
import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  prompts: string[];
}

export function TopicPromptsStrip({ prompts }: Props) {
  const [open, setOpen] = useState(false);
  if (!prompts.length) return null;
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/40"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Prompts · {prompts.length}
        <ChevronDown
          className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul className="space-y-1 border-t border-border/40 px-4 py-2 text-sm text-foreground">
          {prompts.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
