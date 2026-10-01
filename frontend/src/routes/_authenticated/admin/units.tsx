import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { AdminCard, AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { accentClasses } from "@/data/curriculum";
import type { Unit } from "@/data/types";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/admin-utils";

export const Route = createFileRoute("/_authenticated/admin/units")({
  component: UnitsPage,
});

const ACCENTS: Unit["accent"][] = ["teal", "violet", "amber", "rose", "sky"];

type UnitRow = { id: string; title: string; blurb: string; accent: string; position: number; archived: boolean };

async function loadUnits() {
  const [u, l] = await Promise.all([
    supabase.from("units").select("*").order("position"),
    supabase.from("lessons").select("unit_id"),
  ]);
  if (u.error) throw u.error;
  return (u.data ?? []).map((x) => ({ ...x, lessons: (l.data ?? []).filter((y) => y.unit_id === x.id).length }));
}

function UnitsPage() {
  const qc = useQueryClient();
  const units = useQuery({ queryKey: ["admin", "units"], queryFn: loadUnits });
  const [editing, setEditing] = useState<Partial<UnitRow> | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  async function save() {
    if (!editing?.title?.trim()) return;
    const payload = {
      title: editing.title.trim(),
      blurb: editing.blurb?.trim() ?? "",
      accent: editing.accent ?? "teal",
      updated_at: new Date().toISOString(),
    };
    const { error } = editing.id
      ? await supabase.from("units").update(payload).eq("id", editing.id)
      : await supabase.from("units").insert({
          ...payload,
          id: `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`,
          position: units.data?.length ?? 0,
        });
    if (error) {
      toast.error("Couldn't save unit");
      return;
    }
    toast.success("Unit saved");
    setEditing(null);
    refresh();
  }

  async function move(i: number, dir: -1 | 1) {
    const list = units.data ?? [];
    const a = list[i];
    const b = list[i + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("units").update({ position: b.position }).eq("id", a.id),
      supabase.from("units").update({ position: a.position }).eq("id", b.id),
    ]);
    refresh();
  }

  async function toggleArchive(u: UnitRow) {
    await supabase.from("units").update({ archived: !u.archived }).eq("id", u.id);
    toast.success(u.archived ? "Unit restored" : "Unit archived — hidden from nurses");
    refresh();
  }

  return (
    <AdminShell
      title="Units"
      subtitle="Topics nurses see on the Learn screen, in this order"
      actions={
        <Button onClick={() => setEditing({ accent: "teal" })}>
          <Plus /> New unit
        </Button>
      }
    >
      <AdminCard className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="py-3 font-medium">Unit</th>
              <th className="py-3 font-medium">Lessons</th>
              <th className="py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(units.data ?? []).map((u, i) => (
              <tr key={u.id} className={cn(u.archived && "opacity-60")}>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                      <ArrowUp />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={i === (units.data?.length ?? 0) - 1}
                      onClick={() => move(i, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("size-3 rounded-full", accentClasses[u.accent as Unit["accent"]]?.bg)} />
                    <div>
                      <p className="font-semibold">{u.title}</p>
                      <p className="text-xs text-muted-foreground">{u.blurb}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 tabular-nums">{u.lessons}</td>
                <td className="py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", u.archived ? "bg-muted" : "bg-primary/15 text-primary")}>
                    {u.archived ? "Archived" : "Live"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                    <Pencil /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleArchive(u)}>
                    {u.archived ? "Restore" : "Archive"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit unit" : "New unit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Short description</Label>
              <Textarea rows={2} value={editing?.blurb ?? ""} onChange={(e) => setEditing({ ...editing, blurb: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setEditing({ ...editing, accent: a })}
                    aria-label={a}
                    className={cn(
                      "size-8 rounded-full ring-offset-2 ring-offset-background",
                      accentClasses[a].bg,
                      editing?.accent === a && "ring-2 ring-foreground",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
