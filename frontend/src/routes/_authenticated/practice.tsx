import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PartyPopper, Repeat2, Sparkles } from "lucide-react";
import { QuestionView } from "@/components/QuestionView";
import { getLesson } from "@/data/curriculum";
import type { Question } from "@/data/types";
import {
  awardPracticeXp,
  clearMistake,
  mistakeList,
  recordMistake,
  XP_PER_PRACTICE,
} from "@/lib/progress";
import { playComplete, playCorrect, playWrong } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Practice your mistakes — Skillora" },
      {
        name: "description",
        content:
          "Replay the nursing questions you missed until they stick. A short, heart-free practice session built from your own mistake bank.",
      },
      { property: "og:title", content: "Practice your mistakes — Skillora" },
      { property: "og:description", content: "Replay the questions you missed until they stick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Practice,
});

type SessionItem = { key: string; lessonId: string; questionIndex: number; question: Question };

function Practice() {
  const [items, setItems] = useState<SessionItem[] | null>(null);
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [cleared, setCleared] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setItems(
      mistakeList()
        .slice(0, 10)
        .map((m): SessionItem | null => {
          const lesson = getLesson(m.lessonId);
          const q = lesson?.questions[m.questionIndex];
          return q ? { key: m.key, lessonId: m.lessonId, questionIndex: m.questionIndex, question: q } : null;
        })
        .filter((x): x is SessionItem => x !== null),
    );
  }, []);

  if (items === null) {
    return <div className="min-h-screen bg-background" />;
  }

  if (items.length === 0 || done) {
    return <PracticeDone cleared={cleared} total={items.length} />;
  }

  const item = items[step];

  function handleAnswer(isCorrect: boolean) {
    setAnswered(true);
    if (!item) return;
    if (isCorrect) {
      clearMistake(item.key);
      setCleared((c) => c + 1);
      playCorrect();
    } else {
      recordMistake(item.lessonId, item.questionIndex);
      playWrong();
    }
  }

  function advance() {
    if (step + 1 < items!.length) {
      setStep(step + 1);
      setAnswered(false);
      return;
    }
    setDone(true);
    if (cleared > 0) {
      awardPracticeXp();
      playComplete();
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/" aria-label="Leave practice" className="text-muted-foreground hover:text-foreground">
            <Repeat2 className="size-5" />
          </Link>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${(step / items.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold text-muted-foreground">
            {cleared}/{items.length} cleared
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          <Repeat2 className="size-3.5" /> Practice · no hearts at stake
        </p>
        {item && (
          <QuestionView
            key={item.key}
            question={item.question}
            index={step}
            answered={answered}
            onAnswer={handleAnswer}
          />
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {!answered ? (
            <p className="text-center text-sm text-muted-foreground">
              Answer it right and it leaves your practice list for good
            </p>
          ) : (
            <button
              type="button"
              onClick={advance}
              className="chunky w-full bg-primary px-4 py-3.5 font-bold text-primary-foreground"
            >
              {step + 1 < items.length ? "Continue" : "Finish practice"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function PracticeDone({ cleared, total }: { cleared: number; total: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="pop-in w-full max-w-md text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {cleared > 0 ? <PartyPopper className="size-10" /> : <Sparkles className="size-10" />}
        </span>
        <h1 className="mt-5 text-3xl font-bold">
          {cleared > 0 ? "Practice complete" : "Nothing cleared yet"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cleared > 0
            ? `You cleared ${cleared} of ${total} questions — they're gone from your practice list.`
            : "The ones you missed are still on your list. Come back to them after a lesson."}
        </p>
        {cleared > 0 && (
          <p className="mt-4 rounded-xl bg-xp/10 px-4 py-2.5 text-sm font-semibold text-foreground">
            Practice bonus · +{XP_PER_PRACTICE} XP
          </p>
        )}
        <Link
          to="/"
          className="chunky mt-8 block w-full bg-primary px-4 py-3.5 font-bold text-primary-foreground"
        >
          Back to the path
        </Link>
      </div>
    </div>
  );
}
