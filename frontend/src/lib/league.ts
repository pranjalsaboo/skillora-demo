import { allLessons } from "@/data/curriculum";
import type { Question } from "@/data/types";
import { supabase } from "@/integrations/supabase/client";
import { getProgressState, isoDay, weeklyXp } from "@/lib/progress";

export const CHALLENGE_SIZE = 5;
export const POINTS_PER_CORRECT = 20;
export const PERFECT_BONUS = 25;

export type Badge = { id: string; label: string; description: string; emoji: string };
export const BADGES: Badge[] = [
  { id: "first", label: "First Shift", description: "Finish your first daily challenge", emoji: "🩺" },
  { id: "perfect", label: "Flawless", description: "Score 5/5 on a daily challenge", emoji: "🎯" },
  { id: "streak3", label: "On a Roll", description: "3-day challenge streak", emoji: "🔥" },
  { id: "streak7", label: "Week Warrior", description: "7-day challenge streak", emoji: "🏅" },
  { id: "points500", label: "Charge Nurse", description: "Earn 500 challenge points", emoji: "⭐" },
];

/** Same 5 questions for every nurse on a given day (seeded by date). */
export function dailyQuestions(day = isoDay()): Question[] {
  const pool = allLessons.flatMap((l) => l.questions.filter((q) => q.type !== "order"));
  let seed = [...day].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const picked: Question[] = [];
  const used = new Set<number>();
  while (picked.length < Math.min(CHALLENGE_SIZE, pool.length)) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const i = seed % pool.length;
    if (used.has(i)) continue;
    used.add(i);
    picked.push(pool[i]!);
  }
  return picked;
}

export type LeagueMember = {
  user_id: string;
  display_name: string;
  weekly_xp: number;
  challenge_points: number;
  challenge_streak: number;
  last_challenge_day: string | null;
  badges: string[];
  updated_at: string;
};

function displayName(user: { email?: string | undefined; user_metadata: Record<string, unknown> }) {
  const m = user.user_metadata;
  const n =
    (typeof m["full_name"] === "string" && m["full_name"]) ||
    (typeof m["name"] === "string" && m["name"]) ||
    (user.email ?? "Nurse").split("@")[0] ||
    "Nurse";
  return String(n).slice(0, 40);
}

/** Make sure the signed-in nurse has a league row with their current weekly XP. */
export async function syncMyLeague(): Promise<LeagueMember | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: existing } = await supabase.from("league_members").select("*").eq("user_id", user.id).maybeSingle();
  const row = {
    user_id: user.id,
    display_name: existing?.display_name ?? displayName(user),
    weekly_xp: weeklyXp(getProgressState()),
    updated_at: new Date().toISOString(),
  };
  const { data: saved } = await supabase.from("league_members").upsert(row).select("*").single();
  return (saved as LeagueMember | null) ?? null;
}

export async function fetchLeague(): Promise<LeagueMember[]> {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data, error } = await supabase
    .from("league_members")
    .select("*")
    .gte("updated_at", since)
    .limit(100);
  if (error) throw error;
  return (data ?? []) as LeagueMember[];
}

export function leagueScore(m: Pick<LeagueMember, "weekly_xp" | "challenge_points">) {
  return m.weekly_xp + m.challenge_points;
}

export type ChallengeSettings = { points_per_correct: number; perfect_bonus: number };

/** Today's questions (admin hand-picked override if set) plus the scoring settings. */
export async function loadDailyChallenge(): Promise<{ questions: Question[]; settings: ChallengeSettings }> {
  const today = isoDay();
  const [s, o] = await Promise.all([
    supabase.from("challenge_settings").select("points_per_correct,perfect_bonus").eq("id", 1).maybeSingle(),
    supabase.from("challenge_overrides").select("question_ids").eq("day", today).maybeSingle(),
  ]);
  const settings = s.data ?? { points_per_correct: POINTS_PER_CORRECT, perfect_bonus: PERFECT_BONUS };
  let questions = dailyQuestions(today);
  const ids = o.data?.question_ids ?? [];
  if (ids.length > 0) {
    const { data } = await supabase.from("lesson_questions").select("id,data").in("id", ids);
    const picked = ids
      .map((id) => data?.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map((d) => ({ ...(d.data as unknown as Question), id: d.id }));
    if (picked.length > 0) questions = picked;
  }
  return { questions, settings };
}

export async function submitChallenge(
  me: LeagueMember,
  correct: number,
  total: number,
  settings: ChallengeSettings = { points_per_correct: POINTS_PER_CORRECT, perfect_bonus: PERFECT_BONUS },
) {
  const today = isoDay();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const points = correct * settings.points_per_correct + (correct === total ? settings.perfect_bonus : 0);
  const { error } = await supabase
    .from("daily_challenge_results")
    .insert({ user_id: me.user_id, day: today, correct, total, points });
  if (error) throw error;

  const streak = me.last_challenge_day === isoDay(y) ? me.challenge_streak + 1 : 1;
  const totalPoints = me.challenge_points + points;
  const badges = new Set(me.badges);
  const before = badges.size;
  badges.add("first");
  if (correct === total) badges.add("perfect");
  if (streak >= 3) badges.add("streak3");
  if (streak >= 7) badges.add("streak7");
  if (totalPoints >= 500) badges.add("points500");
  const newBadges = [...badges].filter((b) => !me.badges.includes(b));

  await supabase
    .from("league_members")
    .update({
      challenge_points: totalPoints,
      challenge_streak: streak,
      last_challenge_day: today,
      badges: [...badges],
      weekly_xp: weeklyXp(getProgressState()),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", me.user_id);

  return { points, streak, newBadges: before === badges.size ? [] : newBadges };
}
