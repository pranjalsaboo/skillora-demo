import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, MessagesSquare, Users, Zap } from "lucide-react";
import { AdminCard, AdminShell, StatusBadge, useStaffRole } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

type Stats = {
  active: number;
  completed: number;
  challenges: number;
  posts: number;
  hardest: { lessonId: string; lessonTitle: string; prompt: string; misses: number }[];
  drafts: { id: string; title: string; status: string }[];
};

async function loadStats(isAdmin: boolean): Promise<Stats> {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [lessons, questions] = await Promise.all([
    supabase.from("lessons").select("id,title,status").order("updated_at", { ascending: false }),
    supabase.from("lesson_questions").select("lesson_id,position,data"),
  ]);
  const drafts = (lessons.data ?? []).filter((l) => l.status !== "published");
  if (!isAdmin) return { active: 0, completed: 0, challenges: 0, posts: 0, hardest: [], drafts };

  const [progress, results, posts] = await Promise.all([
    supabase.from("learner_progress").select("state,updated_at"),
    supabase.from("daily_challenge_results").select("user_id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  let completed = 0;
  let active = 0;
  const misses = new Map<string, number>();
  for (const row of progress.data ?? []) {
    if (row.updated_at >= since) active++;
    const s = row.state as { completed?: Record<string, unknown>; mistakes?: Record<string, { lessonId: string; questionIndex: number }> };
    completed += Object.keys(s.completed ?? {}).length;
    for (const m of Object.values(s.mistakes ?? {})) {
      const k = `${m.lessonId}:${m.questionIndex}`;
      misses.set(k, (misses.get(k) ?? 0) + 1);
    }
  }
  const hardest = [...misses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, n]) => {
      const [lessonId = "", idx = "0"] = k.split(":");
      const q = (questions.data ?? []).find((x) => x.lesson_id === lessonId && x.position === Number(idx));
      return {
        lessonId,
        lessonTitle: lessons.data?.find((l) => l.id === lessonId)?.title ?? lessonId,
        prompt: (q?.data as { prompt?: string } | undefined)?.prompt ?? `Question ${Number(idx) + 1}`,
        misses: n,
      };
    });
  return { active, completed, challenges: results.count ?? 0, posts: posts.count ?? 0, hardest, drafts };
}

function Overview() {
  const role = useStaffRole();
  const stats = useQuery({ queryKey: ["admin", "stats", role], queryFn: () => loadStats(role === "admin") });
  const s = stats.data;

  const tiles = [
    { label: "Active nurses (7 days)", value: s?.active, Icon: Users },
    { label: "Lessons completed", value: s?.completed, Icon: BookOpen },
    { label: "Challenges played (7 days)", value: s?.challenges, Icon: Zap },
    { label: "New posts (7 days)", value: s?.posts, Icon: MessagesSquare },
  ];

  return (
    <AdminShell title="Overview" subtitle="How Skillora is doing this week">
      {role === "admin" && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          {tiles.map(({ label, value, Icon }) => (
            <AdminCard key={label}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">{value ?? "–"}</p>
            </AdminCard>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {role === "admin" && (
          <AdminCard>
            <h2 className="mb-1 font-bold">Most-missed questions</h2>
            <p className="mb-4 text-xs text-muted-foreground">From nurses' open mistakes. Consider clarifying these.</p>
            {s && s.hardest.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            <ul className="space-y-3">
              {s?.hardest.map((h) => (
                <li key={h.lessonId + h.prompt} className="flex items-start gap-3">
                  <span className="rounded-full bg-heart/15 px-2 py-0.5 text-xs font-bold text-heart">{h.misses}×</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{h.prompt}</p>
                    <Link to="/admin/lessons/$lessonId" params={{ lessonId: h.lessonId }} className="text-xs text-primary">
                      {h.lessonTitle}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </AdminCard>
        )}
        <AdminCard>
          <h2 className="mb-1 font-bold">Waiting to be published</h2>
          <p className="mb-4 text-xs text-muted-foreground">Drafts and lessons in clinical review.</p>
          {s && s.drafts.length === 0 && <p className="text-sm text-muted-foreground">Everything is published.</p>}
          <ul className="divide-y divide-border">
            {s?.drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <Link to="/admin/lessons/$lessonId" params={{ lessonId: d.id }} className="text-sm font-medium hover:text-primary">
                  {d.title}
                </Link>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
