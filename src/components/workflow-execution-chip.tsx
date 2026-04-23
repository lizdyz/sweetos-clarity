import { useQuery } from "@tanstack/react-query";
import { sb as supabase } from "@/lib/sb";
import { Workflow, ExternalLink, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  workflowId: string;
  className?: string;
}

const KIND_META: Record<
  string,
  { label: string; tone: string; subtle: string; description: string }
> = {
  native: {
    label: "Native",
    tone: "text-iris",
    subtle: "bg-iris-soft",
    description: "Runs in-app via the native workflow engine.",
  },
  n8n: {
    label: "n8n",
    tone: "text-rose-600 dark:text-rose-400",
    subtle: "bg-rose-500/10",
    description: "Triggered via webhook on your n8n instance.",
  },
  make: {
    label: "Make",
    tone: "text-violet-600 dark:text-violet-400",
    subtle: "bg-violet-500/10",
    description: "Triggered via webhook on a Make.com scenario.",
  },
  zapier: {
    label: "Zapier",
    tone: "text-amber-600 dark:text-amber-400",
    subtle: "bg-amber-500/10",
    description: "Triggered via webhook on a Zapier Zap.",
  },
};

export function WorkflowExecutionChip({ workflowId, className }: Props) {
  const { data } = useQuery({
    queryKey: ["workflow_execution_chip", workflowId],
    queryFn: async () => {
      const [{ data: wf }, { data: binding }] = await Promise.all([
        supabase
          .from("workflows")
          .select("id, execution_kind")
          .eq("id", workflowId)
          .maybeSingle(),
        supabase
          .from("workflow_execution_bindings")
          .select("execution_kind, trigger_url, external_id, last_synced_at")
          .eq("workflow_id", workflowId)
          .maybeSingle(),
      ]);
      return {
        kind:
          (binding?.execution_kind as string | undefined) ??
          (wf?.execution_kind as string | undefined) ??
          "native",
        triggerUrl: binding?.trigger_url ?? null,
        externalId: binding?.external_id ?? null,
        lastSync: binding?.last_synced_at ?? null,
      };
    },
  });

  const kind = data?.kind ?? "native";
  const meta = KIND_META[kind] ?? KIND_META.native;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition hover:opacity-90",
            meta.subtle,
            meta.tone,
            className,
          )}
        >
          {kind === "native" ? (
            <Zap className="h-3 w-3" />
          ) : (
            <Workflow className="h-3 w-3" />
          )}
          <span>Execution: {meta.label}</span>
          {data?.externalId && (
            <span className="opacity-70">· {data.externalId}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs" align="end">
        <div className="space-y-2">
          <div>
            <div className={cn("text-sm font-semibold", meta.tone)}>
              {meta.label}
            </div>
            <p className="text-muted-foreground">{meta.description}</p>
          </div>
          {kind !== "native" && (
            <>
              {data?.triggerUrl ? (
                <a
                  href={data.triggerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-iris hover:underline"
                >
                  Open trigger URL <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  No trigger URL configured. Open the Execution tab to set one.
                </p>
              )}
              {data?.lastSync && (
                <p className="text-[10px] text-muted-foreground">
                  Last callback: {new Date(data.lastSync).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
