import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sb as supabase } from "@/lib/sb";
import { supabase as authSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chip } from "@/components/chips";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { inviteTeamMember } from "@/utils/team.functions";
import { CadenceTab } from "@/components/cadence-tab";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role_label: string | null;
}

interface RoleRow {
  user_id: string;
  role: "admin" | "member";
}

function SettingsPage() {
  const { user, isAdmin } = useAuth();
  if (!user) return null;

  return (
    <div className="px-6 py-5">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Settings & Team</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and team membership.
        </p>
      </div>

      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="cadence">Cadence</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <ProfileTab userId={user.id} />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <TeamTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="cadence" className="mt-4">
          <CadenceTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  if (profile && !hydrated) {
    setDisplayName(profile.display_name ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setRoleLabel(profile.role_label ?? "");
    setHydrated(true);
  }

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
        role_label: roleLabel || null,
      })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="panel max-w-xl space-y-4 p-6">
      <div className="space-y-1.5">
        <Label>Display name</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Avatar URL</Label>
        <Input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="rounded-xl"
          placeholder="https://…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Role label</Label>
        <Input
          value={roleLabel}
          onChange={(e) => setRoleLabel(e.target.value)}
          className="rounded-xl"
          placeholder="Founder, Operator, Collaborator…"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy} className="bg-iris text-white">
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </section>
  );
}

function TeamTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const invite = useServerFn(inviteTeamMember);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["team-list"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const profiles = (profilesRes.data ?? []) as ProfileRow[];
      const roles = (rolesRes.data ?? []) as RoleRow[];
      const roleMap: Record<string, string[]> = {};
      roles.forEach((r) => {
        roleMap[r.user_id] = [...(roleMap[r.user_id] ?? []), r.role];
      });
      return profiles.map((p) => ({
        ...p,
        roles: roleMap[p.id] ?? [],
      }));
    },
  });

  async function handleInvite() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { data: sessionData } = await authSupabase.auth.getSession();
      const token = sessionData.session?.access_token;
      await invite({
        data: { email: email.trim(), displayName: name.trim() || undefined },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setName("");
      qc.invalidateQueries({ queryKey: ["team-list"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {isAdmin && (
        <section className="panel max-w-xl space-y-4 p-6">
          <div>
            <h2 className="text-sm font-semibold">Invite a team member</h2>
            <p className="text-xs text-muted-foreground">
              Sends an email invitation. They'll be added as a member when they sign in.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display name (optional)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleInvite} disabled={busy} className="bg-iris text-white">
              <UserPlus className="mr-1.5 h-4 w-4" />
              {busy ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </section>
      )}

      <section className="panel p-0">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Team members</h2>
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(data ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-iris text-sm font-bold text-white">
                    {(m.display_name ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {m.display_name ?? "Unnamed"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.role_label ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.roles.length === 0 && <Chip tone="muted">no role</Chip>}
                  {m.roles.map((r) => (
                    <Chip key={r} tone={r === "admin" ? "iris" : "neutral"}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </li>
            ))}
            {(data ?? []).length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">
                No team members yet.
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
