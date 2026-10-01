import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, AdminShell, AdminsOnly, useStaffRole } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listUsers, setUserRole } from "@/lib/admin.functions";
import { selectCls } from "@/lib/admin-utils";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminsPage,
});

type RoleChoice = "admin" | "editor" | "none";

function AdminsPage() {
  const role = useStaffRole();
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const saveRole = useServerFn(setUserRole);
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => fetchUsers(), enabled: role === "admin" });
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<RoleChoice>("editor");
  const [busy, setBusy] = useState(false);

  if (role !== "admin")
    return (
      <AdminShell title="Admins">
        <AdminsOnly />
      </AdminShell>
    );

  async function apply(target: string, r: RoleChoice) {
    setBusy(true);
    try {
      const res = await saveRole({ data: { email: target.trim(), role: r } });
      if (res.ok) {
        toast.success(r === "none" ? "Access removed" : `Now ${r === "admin" ? "an Admin" : "an Editor"}`);
        setEmail("");
        qc.invalidateQueries({ queryKey: ["admin", "users"] });
      } else toast.error(res.message);
    } catch {
      toast.error("Couldn't update access");
    } finally {
      setBusy(false);
    }
  }

  const staff = (users.data ?? []).filter((u) => u.roles.length > 0);

  return (
    <AdminShell title="Admins" subtitle="Who can manage Skillora">
      <div className="grid grid-cols-[1fr_320px] gap-6">
        <AdminCard className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Person</th>
                <th className="px-5 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      className={selectCls}
                      disabled={busy}
                      value={u.roles.includes("admin") ? "admin" : "editor"}
                      onChange={(e) => apply(u.email, e.target.value as RoleChoice)}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="none">Remove access</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>

        <AdminCard className="self-start">
          <h2 className="mb-1 font-bold">Add a team member</h2>
          <p className="mb-4 text-xs text-muted-foreground">They need a Skillora account first.</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.org" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select className={selectCls + " w-full"} value={newRole} onChange={(e) => setNewRole(e.target.value as RoleChoice)}>
                <option value="editor">Editor — writes lessons, can't publish</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>
            <Button className="w-full" disabled={busy || !email.includes("@")} onClick={() => apply(email, newRole)}>
              Give access
            </Button>
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
