import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sb } from "@/lib/sb";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

interface AlertRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  source_kind: string | null;
  source_id: string | null;
  relationship_id: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Topbar bell — surfaces unread bot_alerts (KTI fires etc.).
 */
export function BotAlertsBell() {
  const qc = useQueryClient();
  const { data: alerts = [] } = useQuery<AlertRow[]>({
    queryKey: ["bot_alerts", "recent"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("bot_alerts")
        .select("id, kind, title, body, source_kind, source_id, relationship_id, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
    refetchInterval: 60_000,
  });

  const unreadCount = alerts.filter((a) => !a.read_at).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = alerts.filter((a) => !a.read_at).map((a) => a.id);
      if (ids.length === 0) return;
      const { error } = await sb
        .from("bot_alerts")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot_alerts", "recent"] }),
  });

  return (
    <Popover onOpenChange={(open) => open && unreadCount > 0 && markAllRead.mutate()}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notifications
        </div>
        {alerts.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">All clear.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {alerts.map((a) => {
              const inner = (
                <div className="flex flex-col gap-0.5 px-3 py-2 text-xs hover:bg-muted/40">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        !a.read_at
                          ? "h-1.5 w-1.5 rounded-full bg-amber-500"
                          : "h-1.5 w-1.5 rounded-full bg-transparent"
                      }
                    />
                    <span className="truncate font-medium">{a.title}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {a.body && <p className="line-clamp-2 text-muted-foreground">{a.body}</p>}
                </div>
              );
              if (a.source_kind === "kti_scan" && a.source_id) {
                return (
                  <li key={a.id}>
                    <Link to="/sweetscan">{inner}</Link>
                  </li>
                );
              }
              return <li key={a.id}>{inner}</li>;
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
