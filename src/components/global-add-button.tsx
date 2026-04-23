// Global "+" button for the topbar. Opens the UniversalDropZone in a popover
// so any page in the app can drop a file/link/text/entity straight into the
// Idea Sandbox without navigating away.

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UniversalDropZone } from "@/components/universal-drop-zone";

export function GlobalAddButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-xl"
          aria-label="Drop into Sandbox"
          title="Drop file, link, or thought into Sandbox"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-3">
        <UniversalDropZone compact />
      </PopoverContent>
    </Popover>
  );
}
