// Reusable inline "Add" row used by every planning step.
// One text input + Cmd/Ctrl+Enter or button to commit. No modal.
import { useState, type KeyboardEvent } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  placeholder: string;
  onAdd: (value: string) => Promise<void> | void;
  /** Disable the form — typically when a parent context is missing. */
  disabled?: boolean;
  disabledHint?: string;
  busy?: boolean;
  /** Optional secondary slot rendered to the right of the input (e.g. selectors). */
  rightSlot?: React.ReactNode;
}

export function InlineAddRow({
  placeholder,
  onAdd,
  disabled,
  disabledHint,
  busy,
  rightSlot,
}: Props) {
  const [value, setValue] = useState("");

  const commit = async () => {
    const v = value.trim();
    if (!v) return;
    await onAdd(v);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };

  if (disabled) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        {disabledHint ?? "Pick a parent above to start adding."}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        className="h-8 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
      />
      {rightSlot}
      <Button
        size="sm"
        variant="ghost"
        onClick={commit}
        disabled={!value.trim() || busy}
        className="h-7 gap-1 px-2 text-xs"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        Add
      </Button>
    </div>
  );
}
