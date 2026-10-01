import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Loader2, Play, RotateCcw, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getLesson, getUnitForLesson } from "@/data/curriculum";
import { getCoachPlan } from "@/lib/coach.functions";
import { saveCoach, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Your learning coach — Skillora" },
      {
        name: "description",
        content: "Tell Skillora your goals and study time and get an AI-powered lesson path built around your progress.",
      },
      { property: "og:title", content: "Your learning coach — Skillora" },
      { property: "og:description", content: "A focused, AI-powered nursing lesson path that fits your shifts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Coach,
});

const GOAL_IDEAS = [
  "Feel confident with medication safety",
  "Prepare for a move to a surgical ward",
  "Refresh infection control for an audit",
  "Better conversations with anxious patients",
];

function Coach() {
  const progress = useProgress();
  const fetchPlan = useServerFn(getCoachPlan);
  const [goals, setGoals] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [days, setDays] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (progress.coach) {
      setGoals(progress.coach.goals);
      setMinutes(progress.coach.minutesPerDay);
      setDays(progress.coach.daysPerWeek);
    }
    // only prefill once after the saved plan loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.coach?.createdAt]);

  const plan = progress.coach?.plan ?? null;
  const showForm = !plan || editing;

  const submit = async () => {
    if (goals.trim().length < 3 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPlan({
        data: {
          goals: goals.trim(),
          minutesPerDay: minutes,
          daysPerWeek: days,
          completed: Object.entries(progress.completed).map(([lessonId, r]) => ({
            lessonId,
            bestAccuracy: r.bestAccuracy,
          })),
          mistakeLessonIds: [...new Set(Object.values(progress.mistakes).map((m) => m.lessonId))],
        },
      });
      if (!res.ok) setError(res.error);
      else {
        saveCoach({ goals: goals.trim(), minutesPerDay: minutes, daysPerWeek: days, plan: res.plan, createdAt: Date.now() });
        setEditing(false);
      }
    } catch {
      setError("Couldn't reach the coach. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors",
      active ? "border-primary bg-secondary text-primary" : "border-border bg-card text-muted-foreground",
    );

  return (
    <AppShell>
      <header className="mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Your learning coach</h1>
          <p className="text-sm text-muted-foreground">An AI-powered path around your goals and your shifts.</p>
        </div>
      </header>

      {showForm && (
        <section className="chunky-card border border-border bg-card p-5">
          <label htmlFor="goals" className="text-sm font-semibold">
            What do you want to get better at?
          </label>
          <textarea
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="e.g. I'm starting on a cardiac ward next month and want to be sharp on vitals and meds."
            className="mt-2 w-full resize-none rounded-xl border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {GOAL_IDEAS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoals((cur) => (cur.trim() ? `${cur.trim()}. ${g}` : g))}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
              >
                + {g}
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm font-semibold">Time you can spare a day</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[5, 10, 15, 20].map((m) => (
              <button key={m} type="button" onClick={() => setMinutes(m)} className={chip(minutes === m)}>
                {m} min
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm font-semibold">Days a week</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[2, 3, 5, 7].map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className={chip(days === d)}>
                {d} days
              </button>
            ))}
          </div>

          {error && <p className="mt-4 rounded-xl bg-heart/10 p-3 text-sm">{error}</p>}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || goals.trim().length < 3}
            className="chunky mt-5 inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Building your path…" : "Recommend my path"}
          </button>
          {plan && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-2 w-full py-2 text-sm font-semibold text-muted-foreground"
            >
              Cancel
            </button>
          )}
        </section>
      )}

      {plan && !editing && (
        <>
          <section className="chunky-card border border-border bg-card p-5">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {progress.coach?.minutesPerDay} min · {progress.coach?.daysPerWeek} days a week
            </p>
            <p className="mt-1 font-semibold">{plan.summary}</p>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">Goal: {progress.coach?.goals}</p>
          </section>

          <ol className="mt-5 space-y-3">
            {plan.steps.map((step, i) => {
              const lesson = getLesson(step.lessonId);
              const unit = getUnitForLesson(step.lessonId);
              if (!lesson) return null;
              const done = Boolean(
                progress.completed[step.lessonId] &&
                  (progress.completed[step.lessonId]?.completedAt ?? 0) > (progress.coach?.createdAt ?? 0),
              );
              return (
                <li key={step.lessonId} className="chunky-card flex items-center gap-3 border border-border bg-card p-4">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      done ? "bg-success text-success-foreground" : "bg-secondary text-primary",
                    )}
                  >
                    {done ? <Check className="size-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {unit?.title} · {lesson.minutes} min
                    </p>
                    <p className="font-bold">{lesson.title}</p>
                    <p className="text-sm text-muted-foreground">{step.reason}</p>
                  </div>
                  <Link
                    to="/lesson/$lessonId"
                    params={{ lessonId: lesson.id }}
                    aria-label={`Start ${lesson.title}`}
                    className="chunky shrink-0 bg-primary p-2.5 text-primary-foreground"
                  >
                    <Play className="size-4" />
                  </Link>
                </li>
              );
            })}
          </ol>

          {plan.tip && (
            <p className="mt-5 rounded-2xl bg-secondary p-4 text-sm">
              <span className="font-bold">Shift tip: </span>
              {plan.tip}
            </p>
          )}

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
          >
            <RotateCcw className="size-4" /> Update goals or refresh path
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Suggestions are AI-generated from your progress on this device. Follow your local clinical policies.
          </p>
        </>
      )}
    </AppShell>
  );
}
