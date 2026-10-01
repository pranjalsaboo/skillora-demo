import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Trophy, Zap, Flame, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuestionView } from "@/components/QuestionView";
import {
  BADGES,
  POINTS_PER_CORRECT,
  PERFECT_BONUS,
  loadDailyChallenge,
  fetchLeague,
  leagueScore,
  submitChallenge,
  syncMyLeague,
  type LeagueMember,
} from "@/lib/league";
import { isoDay } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "League & daily challenge — Skillora" },
      { name: "description", content: "Climb the weekly nurse league and take today's 5-question challenge to earn points and badges." },
      { property: "og:title", content: "League & daily challenge — Skillora" },
      { property: "og:description", content: "Compete with fellow nurses on Skillora's weekly scoreboard and daily quiz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["league", "me"], queryFn: syncMyLeague });
  const league = useQuery({ queryKey: ["league", "all"], queryFn: fetchLeague, enabled: me.isSuccess });
  const [playing, setPlaying] = useState(false);
  const challengeInfo = useQuery({ queryKey: ["league", "challenge"], queryFn: loadDailyChallenge });
  const pts = challengeInfo.data?.settings ?? { points_per_correct: POINTS_PER_CORRECT, perfect_bonus: PERFECT_BONUS };

  const refresh = () => qc.invalidateQueries({ queryKey: ["league"] });
  const doneToday = me.data?.last_challenge_day === isoDay();

  const rows = [...(league.data ?? [])]
    .sort((a, b) => leagueScore(b) - leagueScore(a))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  if (playing && me.data) {
    return (
      <AppShell>
        <Challenge
          me={me.data}
          onDone={() => {
            setPlaying(false);
            refresh();
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-xp/20 text-xp">
          <Trophy className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">League</h1>
          <p className="text-sm text-muted-foreground">Last 7 days of XP + challenge points.</p>
        </div>
      </div>

      {/* Daily challenge */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-primary to-primary-deep p-4 text-primary-foreground">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-90">
            <Zap className="size-3.5" /> Daily challenge
          </p>
          <p className="mt-1 text-lg font-bold">5 quick questions, one shot a day</p>
          <p className="text-sm opacity-90">
            {pts.points_per_correct} pts each · +{pts.perfect_bonus} for a perfect score
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Flame className={cn("size-4", (me.data?.challenge_streak ?? 0) > 0 ? "text-streak" : "text-muted-foreground")} />
            {me.data?.challenge_streak ?? 0}-day streak
          </div>
          <button
            disabled={!me.data || doneToday}
            onClick={() => setPlaying(true)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
          >
            {doneToday ? "Done — back tomorrow" : "Start challenge"}
          </button>
        </div>
      </section>

      {/* Badges */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold text-muted-foreground">Your badges</h2>
        <div className="grid grid-cols-5 gap-2">
          {BADGES.map((b) => {
            const has = me.data?.badges.includes(b.id);
            return (
              <div
                key={b.id}
                title={`${b.label} — ${b.description}`}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 text-center",
                  has ? "border-primary/40 bg-secondary" : "border-border bg-card opacity-60",
                )}
              >
                <span className="text-2xl">{has ? b.emoji : <Lock className="size-6 text-muted-foreground" />}</span>
                <span className="text-[10px] font-semibold leading-tight">{b.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Scoreboard */}
      <h2 className="mb-2 text-sm font-bold text-muted-foreground">Scoreboard</h2>
      {(me.isLoading || league.isLoading) && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
      {(me.isError || league.isError) && (
        <p className="py-8 text-center text-sm text-muted-foreground">Couldn't load the league. Check your connection.</p>
      )}
      <ol className="space-y-2">
        {rows.map((row) => {
          const mine = row.user_id === me.data?.user_id;
          return (
            <li
              key={row.user_id}
              className={cn(
                "flex items-center gap-4 rounded-2xl border px-4 py-3",
                mine ? "border-primary bg-secondary" : "border-border bg-card",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  row.rank <= 3 ? "bg-xp/25 text-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {row.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {row.display_name}
                  {mine && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.weekly_xp} XP · {row.challenge_points} pts
                  {row.badges.length > 0 && ` · ${row.badges.map((id) => BADGES.find((b) => b.id === id)?.emoji ?? "").join("")}`}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums">{leagueScore(row)}</span>
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}

function Challenge({ me, onDone }: { me: LeagueMember; onDone: () => void }) {
  const challenge = useQuery({ queryKey: ["league", "challenge"], queryFn: loadDailyChallenge });
  const questions = challenge.data?.questions ?? [];
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<{ points: number; streak: number; newBadges: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const q = questions[index];

  async function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setAnswered(false);
      return;
    }
    setSaving(true);
    try {
      const r = await submitChallenge(me, correct, questions.length, challenge.data?.settings);
      setResult(r);
      confetti({ particleCount: correct === questions.length ? 160 : 80, spread: 70, origin: { y: 0.6 } });
    } catch {
      toast.error("Couldn't save your result — you may have already played today.");
      onDone();
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <div className="py-8 text-center">
        <p className="text-5xl">🏆</p>
        <h1 className="mt-3 text-2xl font-bold">
          {correct}/{questions.length} correct
        </h1>
        <p className="mt-1 text-muted-foreground">
          +{result.points} points · {result.streak}-day streak
        </p>
        {result.newBadges.length > 0 && (
          <div className="mx-auto mt-6 max-w-xs space-y-2">
            <p className="text-sm font-bold">New badge{result.newBadges.length > 1 ? "s" : ""}!</p>
            {result.newBadges.map((id) => {
              const b = BADGES.find((x) => x.id === id);
              return b ? (
                <div key={id} className="flex items-center gap-3 rounded-xl border border-primary/40 bg-secondary p-3 text-left">
                  <span className="text-2xl">{b.emoji}</span>
                  <div>
                    <p className="font-bold">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        )}
        <button onClick={onDone} className="mt-8 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
          Back to league
        </button>
      </div>
    );
  }

  if (challenge.isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading today's challenge…</p>;
  if (!q) return null;
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onDone} className="text-sm font-semibold text-muted-foreground">
          Quit
        </button>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold tabular-nums">
          {index + 1}/{questions.length}
        </span>
      </div>
      <QuestionView
        key={index}
        question={q}
        index={index}
        answered={answered}
        onAnswer={(ok) => {
          setAnswered(true);
          if (ok) setCorrect((c) => c + 1);
        }}
      />
      {answered && (
        <button
          onClick={next}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60"
        >
          {index + 1 < questions.length ? "Next" : saving ? "Saving…" : "See results"}
        </button>
      )}
    </div>
  );
}
