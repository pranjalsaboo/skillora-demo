import { useEffect, useRef, useState } from "react";
import { Headphones, Image as ImageIcon, Pause, Play, FileText, Film } from "lucide-react";
import type { LessonCard } from "@/data/types";
import { cn } from "@/lib/utils";

function CardFrame({
  icon,
  kind,
  title,
  children,
}: {
  icon: React.ReactNode;
  kind: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pop-in chunky-card border border-border bg-card p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        {kind}
      </div>
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AudioPlayer({ transcript, durationLabel }: { transcript: string; durationLabel: string }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [supported, setSupported] = useState(true);
  const estimate = Math.max(8, (transcript.split(/\s+/).length / 2.6) * 1000);
  const startedAt = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 120);
    return () => clearInterval(id);
  }, [playing]);

  function toggle() {
    if (!supported) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      setElapsed(0);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.rate = 1;
    utterance.onend = () => {
      setPlaying(false);
      setElapsed(0);
    };
    startedAt.current = Date.now();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  const pct = playing ? Math.min(100, (elapsed / estimate) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl bg-secondary p-4">
        <button
          type="button"
          onClick={toggle}
          disabled={!supported}
          aria-label={playing ? "Stop narration" : "Play narration"}
          className="chunky flex size-13 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          {playing ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {supported
              ? playing
                ? "Playing narration…"
                : `${durationLabel} · plays out loud, hands free`
              : "Narration is not available in this browser — read the transcript below."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowTranscript((v) => !v)}
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        {showTranscript ? "Hide transcript" : "Show transcript"}
      </button>
      {(showTranscript || !supported) && (
        <p className="rounded-xl bg-muted p-4 text-[0.95rem] leading-relaxed text-foreground/90">{transcript}</p>
      )}
    </div>
  );
}

function Walkthrough({
  poster,
  steps,
  src,
}: {
  poster: string;
  steps: { at: string; text: string }[];
  src?: string;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      setIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 3200);
    return () => clearTimeout(id);
  }, [playing, index, steps.length]);

  if (src) {
    return (
      <video controls poster={poster} className="w-full rounded-2xl border border-border" preload="none">
        <source src={src} />
      </video>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <img src={poster} alt="" loading="lazy" width={1024} height={640} className="w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-foreground/80 p-4 text-background">
          <span className="text-xs font-semibold tabular-nums opacity-80">{steps[index]?.at}</span>
          <p className="text-sm font-medium">{steps[index]?.text}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (index >= steps.length - 1) setIndex(0);
            setPlaying((p) => !p);
          }}
          className="chunky flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : index >= steps.length - 1 ? "Replay" : "Play walkthrough"}
        </button>
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <button
              key={s.at}
              type="button"
              aria-label={`Step ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn("h-2 w-6 rounded-full transition-colors", i <= index ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardView({ card }: { card: LessonCard }) {
  switch (card.type) {
    case "text":
      return (
        <CardFrame icon={<FileText className="size-3.5" />} kind="Read" title={card.title}>
          <p className="text-[0.98rem] leading-relaxed text-foreground/90">{card.body}</p>
          {card.bullets && (
            <ul className="mt-4 space-y-2">
              {card.bullets.map((b) => (
                <li key={b} className="flex gap-3 rounded-xl bg-secondary px-4 py-3 text-sm font-medium">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </CardFrame>
      );
    case "image":
      return (
        <CardFrame icon={<ImageIcon className="size-3.5" />} kind="Look" title={card.title}>
          <img
            src={card.src}
            alt={card.caption}
            loading="lazy"
            width={1024}
            height={640}
            className="w-full rounded-2xl border border-border"
          />
          <p className="mt-3 text-sm text-muted-foreground">{card.caption}</p>
        </CardFrame>
      );
    case "audio":
      return (
        <CardFrame icon={<Headphones className="size-3.5" />} kind="Listen" title={card.title}>
          <AudioPlayer transcript={card.transcript} durationLabel={card.durationLabel} />
        </CardFrame>
      );
    case "video":
      return (
        <CardFrame icon={<Film className="size-3.5" />} kind="Watch" title={card.title}>
          <Walkthrough poster={card.poster} steps={card.steps} {...(card.src ? { src: card.src } : {})} />
        </CardFrame>
      );
  }
}
