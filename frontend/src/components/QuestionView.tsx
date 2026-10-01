import { useMemo, useState } from "react";
import { Check, GripVertical, X } from "lucide-react";
import type { Question } from "@/data/types";
import { cn } from "@/lib/utils";

function shuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    const a = arr[i] as T;
    const b = arr[j] as T;
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
}

export type QuestionViewProps = {
  question: Question;
  index: number;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
};

export function QuestionView({ question, index, answered, onAnswer }: QuestionViewProps) {
  const [choice, setChoice] = useState<number | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [wasCorrect, setWasCorrect] = useState(false);

  const shuffledSteps = useMemo(
    () => (question.type === "order" ? shuffle(question.steps, index + 7) : []),
    [question, index],
  );

  function submitChoice(i: number, correct: boolean) {
    if (answered) return;
    setChoice(i);
    setWasCorrect(correct);
    onAnswer(correct);
  }

  const optionClass = (selected: boolean, correct: boolean) =>
    cn(
      "w-full rounded-xl border-2 px-4 py-3.5 text-left text-[0.97rem] font-semibold transition-colors",
      !answered && "border-border bg-card hover:border-primary/60 hover:bg-secondary",
      answered && correct && "border-success bg-success-soft text-success-deep",
      answered && selected && !correct && "border-destructive bg-danger-soft text-destructive-deep",
      answered && !selected && !correct && "border-border bg-card opacity-60",
    );

  return (
    <div className={cn("space-y-4", answered && !wasCorrect && "shake")}>
      <p className="font-display text-xl font-bold sm:text-2xl">{question.prompt}</p>

      {question.type === "choice" && (
        <div className="space-y-2.5">
          {question.options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => submitChoice(i, i === question.answerIndex)}
              className={optionClass(choice === i, i === question.answerIndex)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "boolean" && (
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((val, i) => (
            <button
              key={String(val)}
              type="button"
              disabled={answered}
              onClick={() => submitChoice(i, val === question.answer)}
              className={cn(optionClass(choice === i, val === question.answer), "text-center")}
            >
              {val ? "True" : "False"}
            </button>
          ))}
        </div>
      )}

      {question.type === "order" && (
        <OrderAnswer
          steps={question.steps}
          shuffled={shuffledSteps}
          picked={picked}
          answered={answered}
          onPick={setPicked}
          onSubmit={(correct) => {
            setWasCorrect(correct);
            onAnswer(correct);
          }}
        />
      )}

      {answered && (
        <div
          className={cn(
            "pop-in flex gap-3 rounded-2xl p-4",
            wasCorrect ? "bg-success-soft text-success-deep" : "bg-danger-soft text-destructive-deep",
          )}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-white",
              wasCorrect ? "bg-success" : "bg-destructive",
            )}
          >
            {wasCorrect ? <Check className="size-4" /> : <X className="size-4" />}
          </span>
          <div>
            <p className="font-bold">{wasCorrect ? "Correct" : "Not quite"}</p>
            <p className="text-sm opacity-90">{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderAnswer({
  steps,
  shuffled,
  picked,
  answered,
  onPick,
  onSubmit,
}: {
  steps: string[];
  shuffled: string[];
  picked: string[];
  answered: boolean;
  onPick: (next: string[]) => void;
  onSubmit: (correct: boolean) => void;
}) {
  const remaining = shuffled.filter((s) => !picked.includes(s));

  return (
    <div className="space-y-4">
      <div className="min-h-30 space-y-2 rounded-2xl border-2 border-dashed border-border p-3">
        {picked.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Tap the steps in the right order</p>
        )}
        {picked.map((s, i) => {
          const correctHere = answered && steps[i] === s;
          return (
            <button
              key={s}
              type="button"
              disabled={answered}
              onClick={() => onPick(picked.filter((p) => p !== s))}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold",
                !answered && "border-primary/40 bg-secondary",
                answered && correctHere && "border-success bg-success-soft text-success-deep",
                answered && !correctHere && "border-destructive bg-danger-soft text-destructive-deep",
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              {s}
            </button>
          );
        })}
      </div>

      {!answered && (
        <>
          <div className="flex flex-wrap gap-2">
            {remaining.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPick([...picked, s])}
                className="flex items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-2.5 text-sm font-semibold hover:border-primary/60"
              >
                <GripVertical className="size-3.5 text-muted-foreground" />
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={picked.length !== steps.length}
            onClick={() => onSubmit(picked.every((s, i) => s === steps[i]))}
            className="chunky w-full bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-40"
          >
            Check order
          </button>
        </>
      )}
    </div>
  );
}
