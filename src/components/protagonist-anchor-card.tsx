import { Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ProtagonistAnchor {
  id: string;
  name: string;
  description: string;
  reference_image_url?: string | null;
}

interface Props {
  anchor: ProtagonistAnchor;
  onChange: (next: ProtagonistAnchor) => void;
  onRemove: () => void;
}

export function ProtagonistAnchorCard({ anchor, onChange, onRemove }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`anchor-name-${anchor.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
              Name
            </Label>
            <Input
              id={`anchor-name-${anchor.id}`}
              value={anchor.name}
              onChange={(e) => onChange({ ...anchor, name: e.target.value })}
              placeholder="e.g. Maya, the founder"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`anchor-desc-${anchor.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
              Appearance
            </Label>
            <Textarea
              id={`anchor-desc-${anchor.id}`}
              value={anchor.description}
              onChange={(e) => onChange({ ...anchor, description: e.target.value })}
              placeholder="Mid-30s, warm-direct, short dark curls, round tortoiseshell glasses, layered linen…"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`anchor-img-${anchor.id}`} className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Reference image URL
            </Label>
            <Input
              id={`anchor-img-${anchor.id}`}
              value={anchor.reference_image_url ?? ""}
              onChange={(e) => onChange({ ...anchor, reference_image_url: e.target.value })}
              placeholder="https://… (paste a Vault file URL)"
            />
          </div>
        </div>
        {anchor.reference_image_url ? (
          <img
            src={anchor.reference_image_url}
            alt={anchor.name}
            className="h-20 w-20 rounded-md object-cover border border-border"
          />
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove anchor
        </Button>
      </div>
    </div>
  );
}
