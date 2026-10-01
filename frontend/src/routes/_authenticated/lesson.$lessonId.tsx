import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, X } from "lucide-react";
import { CardView } from "@/components/CardView";
import { QuestionView } from "@/components/QuestionView";
import { getLesson, getUnitForLesson } from "@/data/curriculum";
import {
  MAX_HEARTS,
  clearMistake,
  completeLesson,
  heartRegenLabel,
  loseHeart,
  recordMistake,
  refillHearts,
  useProgress,
} from "@/lib/progress";
import { playComplete, playCorrect, playWrong } from "@/lib/sfx";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/lesson/$lessonId")({
  head: ({ params }) => {
    const lesson = getLesson(params.lessonId);
    const title = lesson ? `${lesson.title} — Skillora lesson` : "Lesson — Skillora";
    const description = lesson
      ? `${lesson.summary} A ${lesson.minutes} minute nursing microlesson with ${lesson.questions.length} questions.`
      : "A short nursing microlesson with instant-feedback questions.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: LessonPlayer,
});

function LessonPlayer() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const progress = useProgress();
  const lesson = getLesson(lessonId);
  const unit = getUnitForLesson(lessonId);

  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [outOfHearts, setOutOfHearts] = useState(false);

  if (!lesson) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-bold">That lesson isn't available</h1>
        <Link to="/" className="chunky bg-primary px-4 py-2.5 font-bold text-primary-foreground">
          Back to the path
        </Link>
      </div>
    );
  }

  const totalSteps = lesson.cards.length + lesson.questions.length;
  const inQuestions = step >= lesson.cards.length;
  const questionIndex = step - lesson.cards.length;
  const question = inQuestions ? lesson.questions[questionIndex] : null;
  const percent = (step / totalSteps) * 100;

  function handleAnswer(isCorrect: boolean) {
    setAnswered(true);
    if (isCorrect) {
      clearMistake(`${lessonId}:${questionIndex}`);
      setCorrect((c) => c + 1);
      playCorrect();
    } else {
      recordMistake(lessonId, questionIndex);
      loseHeart();
      if (progress.hearts <= 1) setOutOfHearts(true);
      playWrong();
    }
  }

  function advance() {
    if (step + 1 < totalSteps) {
      setStep(step + 1);
      setAnswered(false);
      return;
    }
    const reward = completeLesson({ lessonId, correct, total: lesson!.questions.length });
    playComplete();
    navigate({
      to: "/complete/$lessonId",
      params: { lessonId },
      search: {
        correct,
        total: lesson!.questions.length,
        xp: reward.totalXp,
        perfect: reward.perfectBonus > 0,
        goal: reward.goalBonus > 0,
        streak: reward.streak,
      },
    });
  }

  if (outOfHearts) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <Heart className="size-14 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">You're out of hearts</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {heartRegenLabel(progress) ?? "Hearts refill over time"} — or refill now and carry on.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              refillHearts();
              setOutOfHearts(false);
              setAnswered(false);
            }}
            className="chunky bg-primary px-6 py-3 font-bold text-primary-foreground"
          >
            Refill hearts and continue
          </button>
          <Link to="/" className="text-sm font-semibold text-muted-foreground">
            Leave the lesson
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/" aria-label="Leave lesson" className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </Link>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              key={step}
              className="shine h-full rounded-full bg-success transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="flex items-center gap-1 text-sm font-bold">
            <Heart
              className={cn("size-4", progress.hearts > 0 ? "fill-heart text-heart" : "text-muted-foreground")}
            />
            {progress.hearts}
            <span className="text-muted-foreground">/{MAX_HEARTS}</span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <p className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {unit?.title} · {lesson.title}
        </p>

        {question ? (
          <QuestionView
            key={`${lessonId}-q${questionIndex}`}
            question={question}
            index={questionIndex}
            answered={answered}
            onAnswer={handleAnswer}
          />
        ) : (
          lesson.cards[step] && <CardView key={`${lessonId}-c${step}`} card={lesson.cards[step]} />
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {inQuestions && !answered ? (
            <p className="text-center text-sm text-muted-foreground">
              {question?.type === "order" ? "Build the sequence, then check it" : "Pick your answer"}
            </p>
          ) : (
            <button
              type="button"
              onClick={advance}
              className="chunky w-full bg-primary px-4 py-3.5 font-bold text-primary-foreground"
            >
              {step + 1 < totalSteps ? "Continue" : "Finish lesson"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
