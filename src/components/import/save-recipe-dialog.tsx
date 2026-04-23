import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function SaveRecipeDialog({
  open, onOpenChange, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save this run as a recipe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Notion components export" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">What this recipe handles</label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Group → object-type decisions for Notion exports" rows={3} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Future runs with the same group signatures will get a one-click "Apply recipe" banner.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try { await onSave(name.trim(), desc.trim()); onOpenChange(false); }
              finally { setBusy(false); }
            }}
          >
            Save recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
