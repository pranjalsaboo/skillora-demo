import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, BellRing, Check, CheckCircle2, ChevronRight, Download, Loader2, Lock, Play, Repeat2, Star, X } from "lucide-react";
import { useOnline } from "@/lib/offline";
import { useUnitDownload } from "@/components/DownloadsCard";
import { AppShell } from "@/components/AppShell";
import { GoalRing } from "@/components/GoalRing";
import { accentClasses, curriculum } from "@/data/curriculum";
import { dueReminderSlot, isUnlocked, nextLessonId, updateReminders, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Skillora — Microlearning for nurses, three minutes at a time" },
      {
        name: "description",
        content:
          "Bite-sized nursing lessons with audio, visuals and instant-feedback quizzes. Build a streak, earn XP and keep your clinical skills sharp between shifts.",
      },
      { property: "og:title", content: "Skillora — Microlearning for nurses" },
      {
        property: "og:description",
        content:
          "Three-minute nursing lessons on vital signs, medication safety, infection control and more. Learn on the go, keep your streak alive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearnPath,
});

function LearnPath() {
  const progress = useProgress();
  const nextId = nextLessonId(progress);
  const completedCount = Object.keys(progress.completed).length;
  const mistakeCount = Object.keys(progress.mistakes).length;
  const online = useOnline();
  const { busy, run } = useUnitDownload();
  const slot = dueReminderSlot(progress);
  const showNudge =
    slot !== null && slot !== progress.reminders.dismissed && progress.lessonsToday < progress.dailyGoal;

  return (
    <AppShell>
      {showNudge && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-secondary p-3">
          <BellRing className="size-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm font-semibold">Got 3 minutes? A quick lesson keeps your streak going.</p>
          <button
            type="button"
            aria-label="Dismiss reminder"
            onClick={() => updateReminders({ dismissed: slot })}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <section className="chunky-card mb-8 border border-border bg-card p-5">
        <div className="flex items-center gap-5">
          <GoalRing value={Math.min(progress.lessonsToday, progress.dailyGoal)} goal={progress.dailyGoal} size={72} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold">
              {progress.lessonsToday >= progress.dailyGoal ? "Daily goal complete" : "Today's goal"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {progress.lessonsToday >= progress.dailyGoal
                ? "Streak secured. Anything else today is a bonus."
                : `${progress.dailyGoal - progress.lessonsToday} short lesson${
                    progress.dailyGoal - progress.lessonsToday === 1 ? "" : "s"
                  } left — about ${(progress.dailyGoal - progress.lessonsToday) * 3} minutes.`}
            </p>
            <Link
              to="/lesson/$lessonId"
              params={{ lessonId: nextId }}
              className="chunky mt-3 inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <Play className="size-4" />
              {completedCount === 0 ? "Start learning" : "Continue"}
            </Link>
          </div>
        </div>
      </section>

      <Link
        to="/coach"
        className="chunky-card mt-4 block overflow-hidden border border-border bg-card transition-colors hover:bg-secondary"
      >
        <div className="relative bg-gradient-to-br from-primary to-primary-deep px-4 pb-4 pt-5 text-primary-foreground">
          <Sparkles className="absolute right-4 top-4 size-10 opacity-25" />
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">AI Coach</p>
          <p className="mt-1 text-lg font-bold leading-snug">
            {progress.coach?.plan ? "Your coach's path" : "Get a personal lesson path"}
          </p>
          <p className="mt-1 line-clamp-2 text-sm opacity-90">
            {progress.coach?.plan
              ? `${progress.coach.plan.steps.length} lessons picked for: ${progress.coach.goals}`
              : "Share your goals and study time — AI picks what to learn next"}
          </p>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-muted-foreground">
            {progress.coach?.plan ? "Review or refresh your path" : "Takes less than a minute"}
          </span>
          <span className="chunky inline-flex items-center gap-1.5 bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground">
            {progress.coach?.plan ? "Open path" : "Build my path"}
            <ChevronRight className="size-3.5" />
          </span>
        </div>
      </Link>

      {mistakeCount > 0 && (
        <Link
          to="/practice"
          className="chunky-card mt-4 flex items-center gap-4 border border-border bg-card p-4 transition-colors hover:bg-secondary"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-xp/15">
            <Repeat2 className="size-5 fill-xp text-xp" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Practice your mistakes</p>
            <p className="text-sm text-muted-foreground">
              {mistakeCount} question{mistakeCount === 1 ? "" : "s"} to revisit — no hearts at stake
            </p>
          </div>
        </Link>
      )}

      <div className="mt-8 space-y-10">
        {curriculum.map((unit) => {
          const accent = accentClasses[unit.accent];
          const done = unit.lessons.filter((l) => progress.completed[l.id]).length;
          const saved = Boolean(progress.downloads[unit.id]);

          return (
            <section key={unit.id}>
              <div className={cn("chunky-card border border-border p-4 text-primary-foreground", accent.bg)}>
                <p className="text-xs font-semibold tracking-widest uppercase opacity-80">
                  Unit · {done}/{unit.lessons.length} complete
                </p>
                <h2 className="text-lg font-bold">{unit.title}</h2>
                <p className="text-sm opacity-90">{unit.blurb}</p>
                <div className="mt-3">
                  {saved ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1 text-xs font-bold">
                      <CheckCircle2 className="size-3.5" /> Available offline
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!online || busy !== null}
                      onClick={() => void run(unit)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-card/20 px-3 py-1 text-xs font-bold disabled:opacity-60"
                    >
                      {busy === unit.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                      {online ? "Download" : "Download when online"}
                    </button>
                  )}
                </div>
              </div>

              <ol className="mt-6 space-y-6">
                {unit.lessons.map((lesson, i) => {
                  const record = progress.completed[lesson.id];
                  const unlocked = isUnlocked(lesson.id, progress) && (online || saved);
                  const current = lesson.id === nextId;
                  const offset = i % 2 === 0 ? "sm:ml-0" : "sm:ml-16";

                  return (
                    <li key={lesson.id} className={cn("flex items-center gap-4", offset)}>
                      <div className="relative">
                        <span
                          className={cn(
                            "flex size-16 items-center justify-center rounded-full text-primary-foreground transition-transform",
                            record ? "bg-success" : unlocked ? accent.bg : "bg-locked text-muted-foreground",
                            current && "float-bob ring-4 ring-offset-2 ring-offset-background",
                            current && accent.ring,
                          )}
                        >
                          {record ? (
                            <Check className="size-7" />
                          ) : unlocked ? (
                            <Star className="size-7" />
                          ) : (
                            <Lock className="size-6" />
                          )}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold">{lesson.title}</h3>
                        <p className="truncate text-sm text-muted-foreground">{lesson.summary}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {lesson.minutes} min · {lesson.questions.length} questions
                          {record ? ` · best ${record.bestAccuracy}%` : ""}
                        </p>
                      </div>

                      {unlocked ? (
                        <Link
                          to="/lesson/$lessonId"
                          params={{ lessonId: lesson.id }}
                          className="chunky shrink-0 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                        >
                          {record ? "Redo" : "Start"}
                        </Link>
                      ) : (
                        <span className="shrink-0 rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
                          {!online && !saved && isUnlocked(lesson.id, progress) ? "Offline" : "Locked"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
