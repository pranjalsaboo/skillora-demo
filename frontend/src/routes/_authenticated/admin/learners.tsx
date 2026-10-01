import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { AdminCard, AdminShell, AdminsOnly, useStaffRole } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { listUsers } from "@/lib/admin.functions";
import { BADGES } from "@/lib/league";

export const Route = createFileRoute("/_authenticated/admin/learners")({
  component: LearnersAdmin,
});

function LearnersAdmin() {
  const role = useStaffRole();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const [search, setSearch] = useState("");
  const data = useQuery({
    queryKey: ["admin", "learners"],
    enabled: role === "admin",
    queryFn: async () => {
      const [users, progress, league] = await Promise.all([
        fetchUsers(),
        supabase.from("learner_progress").select("user_id,state,updated_at"),
        supabase.from("league_members").select("*"),
      ]);
      return users.map((u) => {
        const p = progress.data?.find((x) => x.user_id === u.id);
        const s = (p?.state ?? {}) as { xp?: number; streak?: number };
        return { ...u, xp: s.xp ?? 0, streak: s.streak ?? 0, lastActive: p?.updated_at ?? null, league: league.data?.find((x) => x.user_id === u.id) };
      });
    },
  });

  if (role !== "admin")
    return (
      <AdminShell title="Learners">
        <AdminsOnly />
      </AdminShell>
    );

  async function resetLeague(userId: string) {
    if (!confirm("Reset this nurse's league points and challenge streak?")) return;
    const { error } = await supabase
      .from("league_members")
      .update({ challenge_points: 0, weekly_xp: 0, challenge_streak: 0 })
      .eq("user_id", userId);
    if (error) toast.error("Couldn't reset score");
    else toast.success("League score reset");
    qc.invalidateQueries({ queryKey: ["admin", "learners"] });
  }

  const q = search.toLowerCase();
  const rows = (data.data ?? []).filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));

  return (
    <AdminShell title="Learners" subtitle={`${data.data?.length ?? 0} nurses signed up`}>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <AdminCard className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Nurse</th>
              <th className="py-3 font-medium">XP</th>
              <th className="py-3 font-medium">Streak</th>
              <th className="py-3 font-medium">League pts</th>
              <th className="py-3 font-medium">Badges</th>
              <th className="py-3 font-medium">Last active</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.isLoading && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="py-3 tabular-nums">{u.xp}</td>
                <td className="py-3 tabular-nums">{u.streak}</td>
                <td className="py-3 tabular-nums">{u.league ? u.league.challenge_points + u.league.weekly_xp : "—"}</td>
                <td className="py-3">{u.league?.badges.map((b) => BADGES.find((x) => x.id === b)?.emoji).join(" ") || "—"}</td>
                <td className="py-3 text-xs text-muted-foreground">
                  {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "Never"}
                </td>
                <td className="px-5 py-3 text-right">
                  {u.league && (
                    <Button size="sm" variant="ghost" onClick={() => resetLeague(u.id)}>
                      Reset league score
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </AdminShell>
  );
}
