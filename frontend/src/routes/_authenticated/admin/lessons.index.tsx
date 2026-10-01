import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { AdminCard, AdminShell, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { selectCls, slugify } from "@/lib/admin-utils";

export const Route = createFileRoute("/_authenticated/admin/lessons/")({
  component: LessonsPage,
});

async function load() {
  const [u, l, q] = await Promise.all([
    supabase.from("units").select("id,title").order("position"),
    supabase.from("lessons").select("*").order("position"),
    supabase.from("lesson_questions").select("lesson_id"),
  ]);
  if (l.error) throw l.error;
  return { units: u.data ?? [], lessons: l.data ?? [], questions: q.data ?? [] };
}


function LessonsPage() {
  const navigate = useNavigate();
  const data = useQuery({ queryKey: ["admin", "lessons"], queryFn: load });
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("all");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState<{ title: string; unit: string } | null>(null);

  const units = data.data?.units ?? [];
  const rows = (data.data?.lessons ?? []).filter(
    (l) =>
      (unit === "all" || l.unit_id === unit) &&
      (status === "all" || l.status === status) &&
      l.title.toLowerCase().includes(search.toLowerCase()),
  );

  async function create() {
    if (!creating?.title.trim() || !creating.unit) return;
    const id = `${slugify(creating.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const position = (data.data?.lessons ?? []).filter((l) => l.unit_id === creating.unit).length;
    const { error } = await supabase
      .from("lessons")
      .insert({ id, unit_id: creating.unit, title: creating.title.trim(), status: "draft", position });
    if (error) {
      toast.error("Couldn't create lesson");
      return;
    }
    navigate({ to: "/admin/lessons/$lessonId", params: { lessonId: id } });
  }

  return (
    <AdminShell
      title="Lessons"
      subtitle="Write, review and publish microlessons"
      actions={
        <Button onClick={() => setCreating({ title: "", unit: units[0]?.id ?? "" })}>
          <Plus /> New lesson
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search lessons" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={selectCls} value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="all">All units</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.title}
            </option>
          ))}
        </select>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option>
          <option value="draft">Draft</option>
          <option value="review">In review</option>
          <option value="published">Published</option>
        </select>
      </div>

      <AdminCard className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Lesson</th>
              <th className="py-3 font-medium">Unit</th>
              <th className="py-3 font-medium">Questions</th>
              <th className="py-3 font-medium">Reviewed</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-muted/40">
                <td className="px-5 py-3">
                  <Link to="/admin/lessons/$lessonId" params={{ lessonId: l.id }} className="font-semibold hover:text-primary">
                    {l.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{l.minutes} min</p>
                </td>
                <td className="py-3 text-muted-foreground">{units.find((u) => u.id === l.unit_id)?.title}</td>
                <td className="py-3 tabular-nums">{data.data?.questions.filter((q) => q.lesson_id === l.id).length}</td>
                <td className="py-3 text-xs text-muted-foreground">
                  {l.reviewed_by ? `${l.reviewed_by} · ${l.reviewed_at ?? ""}` : "—"}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={l.status} />
                </td>
              </tr>
            ))}
            {data.data && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  No lessons match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminCard>

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={creating?.title ?? ""}
                onChange={(e) => creating && setCreating({ ...creating, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <select
                className={selectCls + " w-full"}
                value={creating?.unit ?? ""}
                onChange={(e) => creating && setCreating({ ...creating, unit: e.target.value })}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(null)}>
              Cancel
            </Button>
            <Button onClick={create}>Create draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
