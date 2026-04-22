import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sb } from "@/lib/sb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** When set, KTI is created scoped to that relationship. Null = universal. */
  relationshipId?: string | null;
  /** When set, default the domain on create. */
  domainId?: string | null;
  onCreated?: (id: string) => void;
}

interface DomainOpt {
  id: string;
  name: string;
}
interface OperatorOpt {
  id: string;
  name: string;
}

/**
 * KTI create form. Forward-looking signal trackers — never confuse with KPIs.
 * See `mem://features/ktis.md`.
 */
export function KtiForm({ relationshipId = null, domainId = null, onCreated }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState("");
  const [domain, setDomain] = useState<string | null>(domainId);
  const [owner, setOwner] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<"task" | "bot_alert" | "flightdeck_flag" | "all">(
    "bot_alert",
  );
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");

  const { data: domains = [] } = useQuery({
    queryKey: ["ktis", "domain-options"],
    queryFn: async () => {
      const { data } = await sb.from("domains").select("id, name").order("sort_order");
      return (data ?? []) as DomainOpt[];
    },
  });
  const { data: operators = [] } = useQuery({
    queryKey: ["ktis", "operator-options"],
    queryFn: async () => {
      const { data } = await sb.from("operators").select("id, name").order("name");
      return (data ?? []) as OperatorOpt[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (!threshold.trim()) throw new Error("Threshold definition is required");
      const { data, error } = await sb
        .from("key_trend_indicators")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          threshold_definition: threshold.trim(),
          domain_id: domain,
          owner_operator_id: owner,
          trigger_action: trigger,
          scan_frequency: frequency,
          relationship_id: relationshipId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (d) => {
      toast.success("KTI created");
      qc.invalidateQueries({ queryKey: ["ktis"] });
      setName("");
      setDescription("");
      setThreshold("");
      onCreated?.(d.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Name
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 text-sm"
          placeholder="e.g. AI procurement signal in mid-market healthcare"
        />
      </div>
      <div>
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          What we're watching for
        </Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 text-sm"
          placeholder="The forward signal we want to catch before it arrives."
        />
      </div>
      <div>
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Threshold — when does this fire?
        </Label>
        <Textarea
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          rows={2}
          className="mt-1 text-sm"
          placeholder="e.g. 3+ mentions in 30d across our scanned sources, or sentiment shift > 0.3"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Domain
          </Label>
          <Select value={domain ?? "none"} onValueChange={(v) => setDomain(v === "none" ? null : v)}>
            <SelectTrigger className="mt-1 text-sm">
              <SelectValue placeholder="Pick a domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Owner
          </Label>
          <Select value={owner ?? "none"} onValueChange={(v) => setOwner(v === "none" ? null : v)}>
            <SelectTrigger className="mt-1 text-sm">
              <SelectValue placeholder="Assign an operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Unassigned —</SelectItem>
              {operators.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Trigger action
          </Label>
          <Select value={trigger} onValueChange={(v) => setTrigger(v as typeof trigger)}>
            <SelectTrigger className="mt-1 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bot_alert">Bot alert</SelectItem>
              <SelectItem value="task">Spawn task</SelectItem>
              <SelectItem value="flightdeck_flag">Flightdeck flag</SelectItem>
              <SelectItem value="all">All three</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Scan cadence
          </Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
            <SelectTrigger className="mt-1 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="w-full gap-1.5"
      >
        {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Create KTI
      </Button>
    </div>
  );
}
