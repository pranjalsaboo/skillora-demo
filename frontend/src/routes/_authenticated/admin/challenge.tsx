import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminCard, AdminShell, AdminsOnly, useStaffRole } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchCatalog } from "@/lib/curriculum-loader";
import { CHALLENGE_SIZE, dailyQuestions } from "@/lib/league";
import { isoDay } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/challenge")({
  component: ChallengeAdmin,
});

type Pool = { id: string; prompt: string; lesson: string }[];

async function load() {
  const [settings, overrides, catalog] = await Promise.all([
    supabase.from("challenge_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("challenge_overrides").select("*").gte("day", isoDay()),
    fetchCatalog(true),
  ]);
  const pool: Pool = catalog.flatMap((u) =>
    u.lessons.flatMap((l) =>
      l.questions.filter((q) => q.type !== "order" && q.id).map((q) => ({ id: q.id!, prompt: q.prompt, lesson: l.title })),
    ),
  );
  return { settings: settings.data, overrides: overrides.data ?? [], pool };
}

function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return isoDay(d);
  });
}

function ChallengeAdmin() {
  const role = useStaffRole();
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "challenge"], queryFn: load, enabled: role === "admin" });
  const [pts, setPts] = useState({ points_per_correct: 20, perfect_bonus: 25 });
  const [picking, setPicking] = useState<{ day: string; ids: string[] } | null>(null);

  useEffect(() => {
    if (data.data?.settings) setPts(data.data.settings);
  }, [data.data?.settings]);

  if (role !== "admin")
    return (
      <AdminShell title="Daily challenge">
        <AdminsOnly />
      </AdminShell>
    );

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "challenge"] });

  async function saveSettings() {
    const { error } = await supabase
      .from("challenge_settings")
      .update({ points_per_correct: Math.max(0, pts.points_per_correct), perfect_bonus: Math.max(0, pts.perfect_bonus) })
      .eq("id", 1);
    if (error) {
      toast.error("Couldn't save scoring");
      return;
    }
    toast.success("Scoring saved");
    refresh();
  }

  async function saveOverride() {
    if (!picking) return;
    const { error } = await supabase.from("challenge_overrides").upsert({ day: picking.day, question_ids: picking.ids });
    if (error) {
      toast.error("Couldn't save questions");
      return;
    }
    toast.success("Questions set for " + picking.day);
    setPicking(null);
    refresh();
  }

  async function clearOverride(day: string) {
    await supabase.from("challenge_overrides").delete().eq("day", day);
    toast.success("Back to automatic picks");
    refresh();
  }

  const pool = data.data?.pool ?? [];

  return (
    <AdminShell title="Daily challenge" subtitle="Five questions every nurse gets each day">
      <div className="grid grid-cols-[1fr_300px] gap-6">
        <AdminCard className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-bold">Next 7 days</h2>
            <p className="text-xs text-muted-foreground">Automatic picks come from published lessons. Hand-pick to override.</p>
          </div>
          <ul className="divide-y divide-border">
            {nextDays(7).map((day, i) => {
              const ov = data.data?.overrides.find((o) => o.day === day);
              const qs = ov
                ? ov.question_ids.map((id) => pool.find((p) => p.id === id)?.prompt ?? "(question removed)")
                : dailyQuestions(day).map((q) => q.prompt);
              return (
                <li key={day} className="px-5 py-4">
                  <div className="mb-2 flex items-center gap-3">
                    <p className="font-semibold">
                      {i === 0 ? "Today" : new Date(day + "T00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
                    </p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ov ? "bg-xp/20" : "bg-muted text-muted-foreground")}>
                      {ov ? "Hand-picked" : "Automatic"}
                    </span>
                    <div className="ml-auto flex gap-2">
                      {ov && (
                        <Button size="sm" variant="ghost" onClick={() => clearOverride(day)}>
                          Use automatic
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setPicking({ day, ids: ov?.question_ids ?? [] })}>
                        Hand-pick
                      </Button>
                    </div>
                  </div>
                  <ol className="list-decimal space-y-0.5 pl-5 text-sm text-muted-foreground">
                    {qs.map((p, j) => (
                      <li key={j} className="truncate">
                        {p}
                      </li>
                    ))}
                  </ol>
                </li>
              );
            })}
          </ul>
        </AdminCard>

        <AdminCard className="self-start">
          <h2 className="mb-4 font-bold">Scoring</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Points per correct answer</Label>
              <Input type="number" min={0} value={pts.points_per_correct} onChange={(e) => setPts({ ...pts, points_per_correct: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Perfect-score bonus</Label>
              <Input type="number" min={0} value={pts.perfect_bonus} onChange={(e) => setPts({ ...pts, perfect_bonus: Number(e.target.value) })} />
            </div>
            <Button className="w-full" onClick={saveSettings}>
              Save scoring
            </Button>
          </div>
        </AdminCard>
      </div>

      <Dialog open={!!picking} onOpenChange={(o) => !o && setPicking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pick {CHALLENGE_SIZE} questions · {picking?.ids.length ?? 0}/{CHALLENGE_SIZE}
            </DialogTitle>
          </DialogHeader>
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {pool.map((p) => {
              const on = picking?.ids.includes(p.id) ?? false;
              const full = (picking?.ids.length ?? 0) >= CHALLENGE_SIZE;
              return (
                <li key={p.id}>
                  <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted", !on && full && "opacity-50")}>
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={on}
                      disabled={!on && full}
                      onChange={() =>
                        picking &&
                        setPicking({ ...picking, ids: on ? picking.ids.filter((x) => x !== p.id) : [...picking.ids, p.id] })
                      }
                    />
                    <span>
                      <span className="block text-sm">{p.prompt}</span>
                      <span className="text-xs text-muted-foreground">{p.lesson}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicking(null)}>
              Cancel
            </Button>
            <Button onClick={saveOverride} disabled={(picking?.ids.length ?? 0) === 0}>
              Save for {picking?.day}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
