import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, PartyPopper, Repeat2, Target, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import { z } from "zod";
import { getLesson, getNextLessonId } from "@/data/curriculum";

const searchSchema = z.object({
  correct: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0).default(0),
  xp: z.coerce.number().min(0).default(0),
  perfect: z.coerce.boolean().default(false),
  goal: z.coerce.boolean().default(false),
  streak: z.coerce.number().min(0).default(0),
});

export const Route = createFileRoute("/_authenticated/complete/$lessonId")({
  validateSearch: searchSchema,
  head: ({ params }) => {
    const lesson = getLesson(params.lessonId);
    const title = lesson ? `${lesson.title} complete — Skillora` : "Lesson complete — Skillora";
    const description = "Your results for this nursing microlesson: accuracy, XP earned and your current streak.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: LessonComplete,
});

function LessonComplete() {
  const { lessonId } = Route.useParams();
  const { correct, total, xp, perfect, goal, streak } = Route.useSearch();
  const lesson = getLesson(lessonId);
  const nextId = getNextLessonId(lessonId);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const missed = Math.max(0, total - correct);
  const [shownXp, setShownXp] = useState(0);

  useEffect(() => {
    const burst = (spread: number, count: number, delay = 0) =>
      setTimeout(
        () =>
          confetti({
            particleCount: count,
            spread,
            startVelocity: 38,
            origin: { y: 0.55 },
            colors: ["#3ecf8e", "#8b5cf6", "#f5b942", "#ffffff"],
          }),
        delay,
      );
    const first = burst(perfect || goal ? 110 : 75, perfect || goal ? 140 : 80);
    const second = perfect || goal ? burst(85, 100, 350) : undefined;
    return () => {
      clearTimeout(first);
      if (second) clearTimeout(second);
    };
  }, [perfect, goal]);

  useEffect(() => {
    if (xp <= 0) return;
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setShownXp(Math.round(xp * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [xp]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="pop-in w-full max-w-md text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-success text-success-foreground">
          <PartyPopper className="size-10" />
        </span>
        <h1 className="mt-5 text-3xl font-bold">{perfect ? "Flawless!" : "Lesson complete"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lesson?.title} · {correct} of {total} correct
        </p>

        <div className="mt-7 grid grid-cols-3 gap-3">
          <Stat icon={<Zap className="size-5 fill-xp text-xp" />} value={`+${shownXp}`} label="XP earned" />
          <Stat icon={<Target className="size-5 text-primary" />} value={`${accuracy}%`} label="Accuracy" />
          <Stat icon={<Flame className="size-5 text-streak" />} value={String(streak)} label="Day streak" />
        </div>

        {(perfect || goal) && (
          <div className="mt-4 space-y-2">
            {perfect && (
              <p className="rounded-xl bg-success-soft px-4 py-2.5 text-sm font-semibold text-success-deep">
                Perfect lesson bonus · +5 XP
              </p>
            )}
            {goal && (
              <p className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold">
                Daily goal reached · +20 XP
              </p>
            )}
          </div>
        )}

        {missed > 0 && (
          <Link
            to="/practice"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            <Repeat2 className="size-4" />
            {missed} question{missed === 1 ? "" : "s"} to revisit — practice now
          </Link>
        )}

        <div className="mt-8 space-y-3">
          {nextId ? (
            <Link
              to="/lesson/$lessonId"
              params={{ lessonId: nextId }}
              className="chunky block w-full bg-primary px-4 py-3.5 font-bold text-primary-foreground"
            >
              Next lesson
            </Link>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">
              That's every lesson for now — nice work.
            </p>
          )}
          <Link
            to="/"
            className="block w-full rounded-xl border-2 border-border px-4 py-3 font-bold text-foreground"
          >
            Back to the path
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="chunky-card border border-border bg-card px-3 py-4">
      <div className="flex justify-center">{icon}</div>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
