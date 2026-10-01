import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { AdminCard, AdminShell, AdminsOnly, useStaffRole } from "@/components/admin/AdminShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Skillora Admin" },
      { name: "description", content: "Engagement, learning, challenge and community reports for Skillora." },
      { property: "og:title", content: "Reports · Skillora Admin" },
      { property: "og:description", content: "Detailed Skillora learning and engagement reports." },
    ],
  }),
  component: Reports,
});

type Rec = { bestAccuracy: number; completedAt: number; attempts: number };
type State = {
  xp?: number;
  streak?: number;
  lastActiveDay?: string | null;
  completed?: Record<string, Rec>;
  xpByDay?: Record<string, number>;
  mistakes?: Record<string, { lessonId: string; questionIndex: number }>;
};

const RANGES = [7, 30, 90] as const;
const day = (d: Date) => d.toISOString().slice(0, 10);

async function loadAll() {
  const [progress, results, posts, league, lessons, units] = await Promise.all([
    supabase.from("learner_progress").select("user_id,state,updated_at"),
    supabase.from("daily_challenge_results").select("user_id,day,correct,total,points"),
    supabase.from("community_posts").select("id,kind,created_at,hidden,report_count"),
    supabase.from("league_members").select("user_id,display_name,weekly_xp,challenge_points,badges"),
    supabase.from("lessons").select("id,title,unit_id,status"),
    supabase.from("units").select("id,title"),
  ]);
  return {
    progress: (progress.data ?? []).map((p) => ({ ...p, state: (p.state ?? {}) as State })),
    results: results.data ?? [],
    posts: posts.data ?? [],
    league: league.data ?? [],
    lessons: lessons.data ?? [],
    units: units.data ?? [],
  };
}

function csv(name: string, rows: (string | number)[][]) {
  const text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = `${name}-${day(new Date())}.csv`;
  a.click();
}

const cfg = {
  xp: { label: "XP earned", color: "var(--primary)" },
  lessons: { label: "Lessons completed", color: "var(--primary)" },
  active: { label: "Active nurses", color: "var(--primary)" },
  plays: { label: "Challenges played", color: "var(--primary)" },
  posts: { label: "Posts", color: "var(--primary)" },
} satisfies ChartConfig;

function Reports() {
  const role = useStaffRole();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const q = useQuery({ queryKey: ["admin", "reports"], queryFn: loadAll, enabled: role === "admin" });

  const r = useMemo(() => {
    const d = q.data;
    if (!d) return null;
    const days: string[] = [];
    for (let i = range - 1; i >= 0; i--) days.push(day(new Date(Date.now() - i * 86400_000)));
    const start = days[0] ?? "";
    const inRange = (s: string) => s >= start;

    const daily = new Map(days.map((k) => [k, { day: k.slice(5), xp: 0, lessons: 0, active: new Set<string>(), plays: 0, posts: 0 }]));
    const lessonStats = new Map<string, { completions: number; acc: number; attempts: number }>();
    const misses = new Map<string, number>();
    let totalXp = 0;
    const learners = d.progress.map((p) => {
      const s = p.state;
      let rangeXp = 0;
      for (const [k, v] of Object.entries(s.xpByDay ?? {})) {
        const row = daily.get(k);
        if (row) { row.xp += v; row.active.add(p.user_id); rangeXp += v; }
      }
      totalXp += rangeXp;
      let rangeLessons = 0;
      for (const [id, rec] of Object.entries(s.completed ?? {})) {
        const k = day(new Date(rec.completedAt));
        const row = daily.get(k);
        if (row) { row.lessons++; row.active.add(p.user_id); rangeLessons++; }
        const ls = lessonStats.get(id) ?? { completions: 0, acc: 0, attempts: 0 };
        ls.completions++; ls.acc += rec.bestAccuracy; ls.attempts += rec.attempts;
        lessonStats.set(id, ls);
      }
      for (const m of Object.values(s.mistakes ?? {})) misses.set(m.lessonId, (misses.get(m.lessonId) ?? 0) + 1);
      const name = d.league.find((l) => l.user_id === p.user_id)?.display_name ?? "Nurse";
      return { name, xp: s.xp ?? 0, rangeXp, rangeLessons, streak: s.streak ?? 0, last: s.lastActiveDay ?? "–", total: Object.keys(s.completed ?? {}).length };
    });
    const res = d.results.filter((x) => inRange(x.day));
    for (const x of res) { const row = daily.get(x.day); if (row) { row.plays++; row.active.add(x.user_id); } }
    const posts = d.posts.filter((p) => inRange(p.created_at.slice(0, 10)));
    for (const p of posts) { const row = daily.get(p.created_at.slice(0, 10)); if (row) row.posts++; }

    const series = [...daily.values()].map((x) => ({ ...x, active: x.active.size }));
    const activeIds = new Set<string>();
    daily.forEach((x) => x.active.forEach((u) => activeIds.add(u)));
    const title = (id: string) => d.lessons.find((l) => l.id === id)?.title ?? id;
    const lessonRows = d.lessons.map((l) => {
      const s = lessonStats.get(l.id);
      return {
        id: l.id,
        title: l.title,
        unit: d.units.find((u) => u.id === l.unit_id)?.title ?? l.unit_id,
        status: l.status,
        completions: s?.completions ?? 0,
        acc: s ? Math.round((s.acc / s.completions) * 100) : 0,
        attempts: s ? +(s.attempts / s.completions).toFixed(1) : 0,
        misses: misses.get(l.id) ?? 0,
      };
    }).sort((a, b) => b.completions - a.completions);
    const unitRows = d.units.map((u) => {
      const ls = lessonRows.filter((l) => l.unit === u.title);
      const c = ls.reduce((a, l) => a + l.completions, 0);
      return { unit: u.title, lessons: ls.length, completions: c, acc: c ? Math.round(ls.reduce((a, l) => a + l.acc * l.completions, 0) / c) : 0 };
    });
    const correct = res.reduce((a, x) => a + x.correct, 0);
    const total = res.reduce((a, x) => a + x.total, 0);
    const kinds = ["tip", "challenge", "progress"].map((k) => ({ kind: k, n: posts.filter((p) => p.kind === k).length }));
    return {
      series, lessonRows, unitRows, kinds, title,
      learners: learners.sort((a, b) => b.rangeXp - a.rangeXp),
      kpi: {
        registered: d.progress.length,
        active: activeIds.size,
        lessons: series.reduce((a, x) => a + x.lessons, 0),
        xp: totalXp,
        plays: res.length,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
        perfect: res.filter((x) => x.correct === x.total).length,
        posts: posts.length,
        reported: posts.filter((p) => p.report_count > 0).length,
        hidden: posts.filter((p) => p.hidden).length,
      },
    };
  }, [q.data, range]);

  if (role !== "admin")
    return (
      <AdminShell title="Reports">
        <AdminsOnly />
      </AdminShell>
    );

  const rangePicker = (
    <div className="flex rounded-lg border border-border bg-background p-0.5">
      {RANGES.map((n) => (
        <button
          key={n}
          onClick={() => setRange(n)}
          className={cn("rounded-md px-3 py-1 text-sm font-medium", range === n ? "bg-secondary text-primary" : "text-muted-foreground")}
        >
          {n} days
        </button>
      ))}
    </div>
  );

  const k = r?.kpi;
  const tiles: [string, string | number | undefined][] = [
    ["Registered learners", k?.registered],
    ["Active learners", k?.active],
    ["Lessons completed", k?.lessons],
    ["XP earned", k?.xp],
    ["Active rate", k ? `${k.registered ? Math.round((k.active / k.registered) * 100) : 0}%` : undefined],
    ["Challenges played", k?.plays],
    ["Challenge accuracy", k ? `${k.accuracy}%` : undefined],
    ["Perfect scores", k?.perfect],
    ["Community posts", k?.posts],
    ["Reported / hidden", k ? `${k.reported} / ${k.hidden}` : undefined],
  ];

  const chart = (title: string, key: keyof typeof cfg, type: "bar" | "line") => (
    <AdminCard>
      <h2 className="mb-3 font-bold">{title}</h2>
      <ChartContainer config={cfg} className="h-56 w-full">
        {type === "bar" ? (
          <BarChart data={r?.series ?? []}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={key} fill={`var(--color-${key})`} radius={4} />
          </BarChart>
        ) : (
          <LineChart data={r?.series ?? []}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line dataKey={key} stroke={`var(--color-${key})`} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ChartContainer>
    </AdminCard>
  );

  const th = "px-3 py-2 text-left text-xs font-semibold text-muted-foreground";
  const td = "px-3 py-2 text-sm";

  return (
    <AdminShell title="Reports" subtitle={`Learning and engagement over the last ${range} days`} actions={rangePicker}>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading reports…</p>}
      {r && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            {tiles.map(([label, v]) => (
              <AdminCard key={label} className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{v ?? "–"}</p>
              </AdminCard>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {chart("Active nurses per day", "active", "line")}
            {chart("XP earned per day", "xp", "line")}
            {chart("Lessons completed per day", "lessons", "bar")}
            {chart("Daily challenges played", "plays", "bar")}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <AdminCard className="col-span-2">
              <h2 className="mb-3 font-bold">Units</h2>
              <table className="w-full">
                <thead><tr className="border-b border-border"><th className={th}>Unit</th><th className={th}>Lessons</th><th className={th}>Completions</th><th className={th}>Avg accuracy</th></tr></thead>
                <tbody>
                  {r.unitRows.map((u) => (
                    <tr key={u.unit} className="border-b border-border last:border-0">
                      <td className={cn(td, "font-medium")}>{u.unit}</td><td className={td}>{u.lessons}</td><td className={td}>{u.completions}</td><td className={td}>{u.acc}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminCard>
            <AdminCard>
              <h2 className="mb-3 font-bold">Community posts by type</h2>
              <ul className="space-y-3">
                {r.kinds.map((x) => {
                  const max = Math.max(1, ...r.kinds.map((y) => y.n));
                  return (
                    <li key={x.kind}>
                      <div className="mb-1 flex justify-between text-sm capitalize"><span>{x.kind === "tip" ? "Study tips" : x.kind}</span><span className="font-semibold">{x.n}</span></div>
                      <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(x.n / max) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            </AdminCard>
          </div>

          <AdminCard>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Lesson performance (all time)</h2>
              <Button size="sm" variant="outline" onClick={() => csv("lesson-performance", [["Lesson", "Unit", "Status", "Completions", "Avg best accuracy %", "Avg attempts", "Open mistakes"], ...r.lessonRows.map((l) => [l.title, l.unit, l.status, l.completions, l.acc, l.attempts, l.misses])])}>
                <Download className="size-4" /> Export CSV
              </Button>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-border"><th className={th}>Lesson</th><th className={th}>Unit</th><th className={th}>Status</th><th className={th}>Completions</th><th className={th}>Avg accuracy</th><th className={th}>Avg attempts</th><th className={th}>Open mistakes</th></tr></thead>
              <tbody>
                {r.lessonRows.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className={cn(td, "font-medium")}>{l.title}</td><td className={td}>{l.unit}</td><td className={cn(td, "capitalize")}>{l.status}</td>
                    <td className={td}>{l.completions}</td>
                    <td className={cn(td, l.completions && l.acc < 70 ? "font-semibold text-heart" : "")}>{l.completions ? `${l.acc}%` : "–"}</td>
                    <td className={td}>{l.attempts || "–"}</td><td className={td}>{l.misses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>

          <AdminCard>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Learner activity</h2>
              <Button size="sm" variant="outline" onClick={() => csv("learner-activity", [["Name", `XP (${range}d)`, `Lessons (${range}d)`, "Total lessons", "Total XP", "Streak", "Last active"], ...r.learners.map((l) => [l.name, l.rangeXp, l.rangeLessons, l.total, l.xp, l.streak, l.last])])}>
                <Download className="size-4" /> Export CSV
              </Button>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-border"><th className={th}>Name</th><th className={th}>XP ({range}d)</th><th className={th}>Lessons ({range}d)</th><th className={th}>Total lessons</th><th className={th}>Total XP</th><th className={th}>Streak</th><th className={th}>Last active</th></tr></thead>
              <tbody>
                {r.learners.length === 0 && <tr><td className={td} colSpan={7}>No learners yet.</td></tr>}
                {r.learners.map((l, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className={cn(td, "font-medium")}>{l.name}</td><td className={td}>{l.rangeXp}</td><td className={td}>{l.rangeLessons}</td><td className={td}>{l.total}</td><td className={td}>{l.xp}</td><td className={td}>{l.streak}</td><td className={td}>{l.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
        </div>
      )}
    </AdminShell>
  );
}
