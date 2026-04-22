import { useState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RecurrencePopoverProps {
  value?: string | null;
  onChange: (rule: string | null) => void;
  className?: string;
}

type Freq = "NEVER" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

function parseFreq(rule: string | null | undefined): { freq: Freq; interval: number } {
  if (!rule) return { freq: "NEVER", interval: 1 };
  const upper = rule.toUpperCase();
  const freqMatch = upper.match(/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/);
  const intervalMatch = upper.match(/INTERVAL=(\d+)/);
  if (!freqMatch) return { freq: "CUSTOM", interval: 1 };
  return {
    freq: freqMatch[1] as Freq,
    interval: intervalMatch ? parseInt(intervalMatch[1], 10) : 1,
  };
}

function buildRule(freq: Freq, interval: number): string | null {
  if (freq === "NEVER") return null;
  if (freq === "CUSTOM") return null;
  const i = Math.max(1, interval);
  return `FREQ=${freq};INTERVAL=${i}`;
}

function describe(rule: string | null | undefined): string {
  const { freq, interval } = parseFreq(rule);
  if (freq === "NEVER") return "No repeat";
  if (freq === "CUSTOM") return rule || "Custom";
  const unit =
    freq === "DAILY" ? "day" : freq === "WEEKLY" ? "week" : freq === "MONTHLY" ? "month" : "year";
  if (interval === 1) return `Every ${unit}`;
  return `Every ${interval} ${unit}s`;
}

export function RecurrencePopover({ value, onChange, className }: RecurrencePopoverProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseFreq(value);
  const [freq, setFreq] = useState<Freq>(parsed.freq);
  const [interval, setIntervalVal] = useState<number>(parsed.interval);
  const [custom, setCustom] = useState<string>(parsed.freq === "CUSTOM" ? value || "" : "");

  function apply() {
    if (freq === "CUSTOM") {
      onChange(custom.trim() || null);
    } else {
      onChange(buildRule(freq, interval));
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 gap-1.5 px-2 text-xs",
            value && "border-violet-500/40 bg-violet-500/5 text-violet-700 dark:text-violet-300",
            className,
          )}
        >
          <Repeat className="h-3 w-3" />
          {describe(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Repeats</Label>
            <Select value={freq} onValueChange={(v) => setFreq(v as Freq)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEVER">Never</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
                <SelectItem value="CUSTOM">Custom (RRULE)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {freq !== "NEVER" && freq !== "CUSTOM" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Every N</Label>
              <Input
                type="number"
                min={1}
                value={interval}
                onChange={(e) => setIntervalVal(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="h-8 text-xs"
              />
            </div>
          )}
          {freq === "CUSTOM" && (
            <div className="space-y-1.5">
              <Label className="text-xs">RRULE</Label>
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="FREQ=WEEKLY;INTERVAL=2"
                className="h-8 font-mono text-xs"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { onChange(null); setOpen(false); }}>
              Clear
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
