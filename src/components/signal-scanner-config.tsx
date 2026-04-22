import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Radar, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KtiPanel } from "@/components/kti-panel";

interface Props {
  domainId: string;
  domainName: string;
}

/**
 * SweetScan — embeds on a Domain detail page.
 * Two surfaces:
 *  - Rubric scanner: pulls external best-practice signals into Excellence-Rubric proposals.
 *  - Forward radar: KTIs scoped to this domain.
 */
export function SignalScannerConfig({ domainId, domainName }: Props) {
  const [query, setQuery] = useState(`${domainName} best practices 2025`);
  const [sources, setSources] = useState("");

  const run = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("scan-signals", {
        body: {
          mode: "rubric",
          domain_id: domainId,
          query,
          sources: sources
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      if (error) throw error;
      return data as { proposals_created: number };
    },
    onSuccess: (d) => toast.success(`${d.proposals_created} checklist proposal(s) created`),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="panel-raised space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Radar className="h-4 w-4 text-[color:var(--iris-violet)]" />
        <h3 className="text-sm font-semibold tracking-tight">SweetScan</h3>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Pull signals · watch the radar
        </span>
      </div>

      <Tabs defaultValue="radar">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="radar">Forward radar</TabsTrigger>
          <TabsTrigger value="rubric">Rubric scanner</TabsTrigger>
        </TabsList>

        <TabsContent value="radar" className="pt-3">
          <KtiPanel domainId={domainId} compact />
        </TabsContent>

        <TabsContent value="rubric" className="space-y-3 pt-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Query
            </label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Source URLs (optional, one per line)
            </label>
            <Textarea
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              rows={3}
              className="mt-1 font-mono text-xs"
              placeholder="https://example.com/best-practices"
            />
          </div>
          <Button onClick={() => run.mutate()} disabled={run.isPending} className="w-full gap-1.5">
            {run.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run scan now
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
