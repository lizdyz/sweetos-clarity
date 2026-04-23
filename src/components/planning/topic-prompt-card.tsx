// Collapsible prompt card. Used by seeded starter Topics to nudge thinking
// without forcing structure. Collapsed by default; click to expand.
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  question: string;
  children?: React.ReactNode;
}

export function TopicPromptCard({ question, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/40"
      >
        <ChevronRight
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
        />
        {question}
      </button>
      {open && children && (
        <div className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  );
}
