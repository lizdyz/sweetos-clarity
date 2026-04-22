import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryTrail } from "@/components/story-trail";

/**
 * MasterStoryTrail — workspace-wide narrative glance for /today.
 * Collapsible. Reads from sparks + component_outputs + decisions + audit log.
 * See `mem://design/story-trail.md`.
 */
export function MasterStoryTrail() {
  const [open, setOpen] = useState(true);
  const [limit, setLimit] = useState(20);

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen((o) => !o)}
          className="h-7 gap-1 px-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {open ? "Hide story" : "Show story"}
        </Button>
        {open && (
          <div className="ml-auto flex items-center gap-1">
            {[20, 50].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={limit === n ? "default" : "outline"}
                className="h-6 px-2 text-[10px]"
                onClick={() => setLimit(n)}
              >
                Last {n}
              </Button>
            ))}
          </div>
        )}
      </div>
      {open && <StoryTrail subjectKind="workspace" limit={limit} />}
    </section>
  );
}
