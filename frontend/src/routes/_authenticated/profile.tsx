import { AccountCard } from "@/components/AccountCard";
import { AdminLink } from "@/components/AdminLink";
import { createFileRoute } from "@tanstack/react-router";
import { Award, BookOpenCheck, Flame, Target, Volume2, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { allLessons } from "@/data/curriculum";
import { isoDay, levelInfo, resetProgress, setDailyGoal, setSound, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { RemindersCard } from "@/components/RemindersCard";
import { DownloadsCard } from "@/components/DownloadsCard";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your progress — Skillora" },
      {
        name: "description",
        content: "Track your learning streak, XP, level and completed nursing lessons, and set your daily goal.",
      },
      { property: "og:title", content: "Your progress — Skillora" },
      { property: "og:description", content: "Streak, XP, level and badges from your nursing microlearning." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const progress = useProgress();
  const level = levelInfo(progress.xp);
  const completedCount = Object.keys(progress.completed).length;

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = isoDay(d);
    return { key, active: (progress.xpByDay[key] ?? 0) > 0, label: d.getDate() };
  });

  const badges = [
    { id: "first", name: "First shift", earned: completedCount >= 1, hint: "Finish one lesson" },
    { id: "streak3", name: "Three in a row", earned: progress.streak >= 3, hint: "3 day streak" },
    { id: "five", name: "Ward round", earned: completedCount >= 5, hint: "Finish 5 lessons" },
    { id: "xp100", name: "Century", earned: progress.xp >= 100, hint: "Earn 100 XP" },
    {
      id: "perfect",
      name: "Flawless",
      earned: Object.values(progress.completed).some((r) => r.bestAccuracy === 100),
      hint: "Score 100% in a lesson",
    },
    { id: "all", name: "Full curriculum", earned: completedCount >= allLessons.length, hint: "Finish every lesson" },
  ];

  return (
    <AppShell>
      <section className="chunky-card border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
            {level.level}
          </span>
          <div>
            <h1 className="text-xl font-bold">{level.title}</h1>
            <p className="text-sm text-muted-foreground">{level.toNext} XP to the next level</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${level.percent}%` }} />
        </div>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-3">
        <Tile icon={<Flame className="size-5 text-streak" />} value={progress.streak} label="Day streak" />
        <Tile icon={<Zap className="size-5 fill-xp text-xp" />} value={progress.xp} label="Total XP" />
        <Tile icon={<BookOpenCheck className="size-5 text-primary" />} value={completedCount} label="Lessons" />
      </section>

      <section className="chunky-card mt-5 border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Target className="size-4.5 text-primary" /> Daily goal
        </h2>
        <p className="text-sm text-muted-foreground">How many lessons do you want to finish each day?</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[1, 3, 5].map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => setDailyGoal(goal)}
              className={cn(
                "rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors",
                progress.dailyGoal === goal
                  ? "border-primary bg-secondary text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {goal} {goal === 1 ? "lesson" : "lessons"}
            </button>
          ))}
        </div>
      </section>

      <RemindersCard />
      <DownloadsCard />

      <section className="chunky-card mt-5 border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Volume2 className="size-4.5 text-primary" /> Sound effects
        </h2>
        <p className="text-sm text-muted-foreground">
          A chime when you answer correctly and a fanfare when you finish a lesson.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[true, false].map((on) => (
            <button
              key={String(on)}
              type="button"
              onClick={() => setSound(on)}
              className={cn(
                "rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors",
                progress.sound === on
                  ? "border-primary bg-secondary text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {on ? "On" : "Off"}
            </button>
          ))}
        </div>
      </section>

      <section className="chunky-card mt-5 border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Last two weeks</h2>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {last14.map((day) => (
            <div
              key={day.key}
              title={day.key}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-xs font-semibold",
                day.active ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {day.label}
            </div>
          ))}
        </div>
      </section>

      <section className="chunky-card mt-5 border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Award className="size-4.5 text-xp" /> Badges
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={cn(
                "rounded-xl border-2 p-3 text-center",
                b.earned ? "border-xp/50 bg-xp/10" : "border-dashed border-border opacity-60",
              )}
            >
              <p className="text-sm font-bold">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.earned ? "Earned" : b.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <AdminLink />
      <AccountCard />

      <button
        type="button"
        onClick={() => {
          if (confirm("Reset all your progress? This also clears it on your other devices.")) resetProgress();
        }}
        className="mt-6 w-full rounded-xl border-2 border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
      >
        Reset progress
      </button>
    </AppShell>
  );
}

function Tile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="chunky-card border border-border bg-card px-3 py-4 text-center">
      <div className="flex justify-center">{icon}</div>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
