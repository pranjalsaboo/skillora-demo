import { useSyncExternalStore } from "react";
import { lessonOrder } from "@/data/curriculum";

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const XP_PER_LESSON = 10;
export const XP_PERFECT_BONUS = 5;
export const XP_DAILY_GOAL_BONUS = 20;
export const XP_PER_LEVEL = 100;
export const XP_PER_PRACTICE = 5;

export type LessonRecord = {
  bestAccuracy: number;
  completedAt: number;
  attempts: number;
};

export type ProgressState = {
  xp: number;
  streak: number;
  /** ISO day (YYYY-MM-DD) of the last completed lesson. */
  lastActiveDay: string | null;
  hearts: number;
  heartsUpdatedAt: number;
  dailyGoal: number;
  lessonsToday: number;
  today: string | null;
  goalBonusClaimedOn: string | null;
  completed: Record<string, LessonRecord>;
  /** XP earned per ISO day, used for the weekly leaderboard. */
  xpByDay: Record<string, number>;
  /** Questions answered incorrectly, keyed "<lessonId>:<questionIndex>". */
  mistakes: Record<string, MistakeEntry>;
  /** Whether sound effects play. */
  sound: boolean;
  reminders: ReminderSettings;
  coach: CoachState | null;
  /** Unit ids saved for offline use, with their download size in bytes. */
  downloads: Record<string, { size: number; savedAt: number }>;
  /** Epoch ms of the last learner change, used to merge with the cloud copy. */
  updatedAt?: number;
  /** Epoch ms of the last "reset progress". */
  resetAt?: number;
};

export type CoachState = {
  goals: string;
  minutesPerDay: number;
  daysPerWeek: number;
  plan: { summary: string; steps: { lessonId: string; reason: string }[]; tip: string } | null;
  createdAt: number;
};

export type ShiftPattern = "day" | "night" | "rotating" | "custom";

export type ReminderSettings = {
  enabled: boolean;
  shift: ShiftPattern;
  /** "HH:MM" local times, max 3. */
  times: string[];
  /** Weekdays 0 (Sun) – 6 (Sat). */
  days: number[];
  /** Epoch ms; reminders are silent until then. Infinity-like value = paused until resumed. */
  pausedUntil: number | null;
  /** "YYYY-MM-DD@HH:MM" of the last reminder slot already shown. */
  lastFired: string | null;
  /** Slot dismissed from the home banner. */
  dismissed: string | null;
};

export const SHIFT_PRESETS: Record<Exclude<ShiftPattern, "custom">, { label: string; times: string[] }> = {
  day: { label: "Day shifts", times: ["06:30", "12:30", "20:00"] },
  night: { label: "Night shifts", times: ["18:00", "02:00", "09:00"] },
  rotating: { label: "Rotating", times: ["08:00", "19:00"] },
};

export const PAUSE_FOREVER = 8_640_000_000_000_000;

export type MistakeEntry = {
  lessonId: string;
  questionIndex: number;
  missedAt: number;
};

const STORAGE_KEY = "nurseup.progress.v1";

export const defaultState: ProgressState = {
  xp: 0,
  streak: 0,
  lastActiveDay: null,
  hearts: MAX_HEARTS,
  heartsUpdatedAt: 0,
  dailyGoal: 3,
  lessonsToday: 0,
  today: null,
  goalBonusClaimedOn: null,
  completed: {},
  xpByDay: {},
  mistakes: {},
  sound: true,
  reminders: {
    enabled: false,
    shift: "day",
    times: ["06:30", "12:30", "20:00"],
    days: [0, 1, 2, 3, 4, 5, 6],
    pausedUntil: null,
    lastFired: null,
    dismissed: null,
  },
  downloads: {},
  coach: null,
};

export function isoDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toUtc(day: string): number {
  const [y = 1970, m = 1, d = 1] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

let state: ProgressState = defaultState;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — progress stays in memory for this session */
  }
}

/** Applies time-based rules: heart regeneration, streak break and day rollover. */
function settle(s: ProgressState, now = Date.now()): ProgressState {
  let next = s;
  const today = isoDay(new Date(now));

  if (next.hearts < MAX_HEARTS) {
    const base = next.heartsUpdatedAt || now;
    const regained = Math.floor((now - base) / HEART_REGEN_MS);
    if (regained > 0) {
      const hearts = Math.min(MAX_HEARTS, next.hearts + regained);
      next = {
        ...next,
        hearts,
        heartsUpdatedAt: hearts === MAX_HEARTS ? 0 : base + regained * HEART_REGEN_MS,
      };
    }
  }

  if (next.today !== today) {
    next = { ...next, today, lessonsToday: 0 };
  }

  if (next.reminders.pausedUntil && next.reminders.pausedUntil <= now) {
    next = { ...next, reminders: { ...next.reminders, pausedUntil: null } };
  }

  if (next.lastActiveDay && daysBetween(next.lastActiveDay, today) > 1) {
    next = { ...next, streak: 0 };
  }

  return next;
}

function load() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProgressState;
      state = { ...defaultState, ...parsed, reminders: { ...defaultState.reminders, ...parsed.reminders } };
    }
  } catch {
    /* corrupt or unavailable storage — start fresh */
  }
  state = settle(state);
  persist();
  emit();
}

const changeListeners = new Set<() => void>();

function set(updater: (s: ProgressState) => ProgressState) {
  state = { ...updater(settle(state)), updatedAt: Date.now() };
  persist();
  emit();
  changeListeners.forEach((l) => l());
}

/** Current progress snapshot (loads from storage if needed). */
export function getProgressState(): ProgressState {
  load();
  return state;
}

/** Fires when the learner changes progress (not on time-based settling or sync). */
export function onProgressChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/** Replaces progress wholesale, e.g. after merging with the cloud copy. */
export function replaceProgress(next: ProgressState) {
  load();
  state = settle({ ...defaultState, ...next, reminders: { ...defaultState.reminders, ...next.reminders } });
  persist();
  emit();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const timer = setInterval(() => {
    const settled = settle(state);
    if (settled !== state) {
      state = settled;
      persist();
      emit();
    }
  }, 30_000);
  return () => {
    listeners.delete(listener);
    clearInterval(timer);
  };
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => defaultState,
  );
}

export type LessonResult = {
  lessonId: string;
  correct: number;
  total: number;
};

export type LessonReward = {
  baseXp: number;
  perfectBonus: number;
  goalBonus: number;
  totalXp: number;
  streak: number;
  accuracy: number;
  goalReached: boolean;
};

export function completeLesson({ lessonId, correct, total }: LessonResult): LessonReward {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const perfect = total > 0 && correct === total;
  let reward: LessonReward = {
    baseXp: XP_PER_LESSON,
    perfectBonus: perfect ? XP_PERFECT_BONUS : 0,
    goalBonus: 0,
    totalXp: 0,
    streak: 0,
    accuracy,
    goalReached: false,
  };

  set((s) => {
    const today = isoDay();
    const first = s.lastActiveDay !== today;
    const continues = s.lastActiveDay ? daysBetween(s.lastActiveDay, today) === 1 : false;
    const streak = first ? (continues ? s.streak + 1 : 1) : s.streak;

    const lessonsToday = s.lessonsToday + 1;
    const goalReached = lessonsToday >= s.dailyGoal;
    const goalBonus = goalReached && s.goalBonusClaimedOn !== today ? XP_DAILY_GOAL_BONUS : 0;
    const totalXp = reward.baseXp + reward.perfectBonus + goalBonus;

    reward = { ...reward, goalBonus, totalXp, streak, goalReached };

    const prev = s.completed[lessonId];
    return {
      ...s,
      xp: s.xp + totalXp,
      streak,
      lastActiveDay: today,
      today,
      lessonsToday,
      goalBonusClaimedOn: goalBonus > 0 ? today : s.goalBonusClaimedOn,
      completed: {
        ...s.completed,
        [lessonId]: {
          bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
          completedAt: Date.now(),
          attempts: (prev?.attempts ?? 0) + 1,
        },
      },
      xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + totalXp },
    };
  });

  return reward;
}

export function loseHeart() {
  set((s) => ({
    ...s,
    hearts: Math.max(0, s.hearts - 1),
    heartsUpdatedAt: s.hearts === MAX_HEARTS ? Date.now() : s.heartsUpdatedAt || Date.now(),
  }));
}

export function refillHearts() {
  set((s) => ({ ...s, hearts: MAX_HEARTS, heartsUpdatedAt: 0 }));
}

export type MistakeItem = MistakeEntry & { key: string };

/** Saves a wrongly answered question to the practice bank. */
export function recordMistake(lessonId: string, questionIndex: number) {
  set((s) => ({
    ...s,
    mistakes: {
      ...s.mistakes,
      [`${lessonId}:${questionIndex}`]: { lessonId, questionIndex, missedAt: Date.now() },
    },
  }));
}

/** Removes a question from the practice bank once it has been answered correctly. */
export function clearMistake(key: string) {
  set((s) => {
    if (!s.mistakes[key]) return s;
    const next = { ...s.mistakes };
    delete next[key];
    return { ...s, mistakes: next };
  });
}

/** Practice bank entries, oldest miss first. Safe to call before hydration. */
export function mistakeList(): MistakeItem[] {
  load();
  return Object.entries(state.mistakes)
    .map(([key, m]) => ({ key, lessonId: m.lessonId, questionIndex: m.questionIndex, missedAt: m.missedAt }))
    .sort((a, b) => a.missedAt - b.missedAt);
}

export function mistakeCount(): number {
  load();
  return Object.keys(state.mistakes).length;
}

/** Small reward for finishing a practice session that cleared at least one mistake. */
export function awardPracticeXp(amount: number = XP_PER_PRACTICE) {
  set((s) => {
    const today = isoDay();
    return { ...s, xp: s.xp + amount, xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + amount } };
  });
}

export function setSound(on: boolean) {
  set((s) => ({ ...s, sound: on }));
}

/** Current sound preference; safe to call before hydration (defaults to on). */
export function soundOn(): boolean {
  load();
  return state.sound;
}

export function setDailyGoal(goal: number) {
  set((s) => ({ ...s, dailyGoal: goal }));
}

export function resetProgress() {
  set(() => ({
    ...defaultState,
    today: isoDay(),
    sound: state.sound,
    reminders: state.reminders,
    downloads: state.downloads,
    coach: state.coach,
    resetAt: Date.now(),
  }));
}

export function isUnlocked(lessonId: string, s: ProgressState): boolean {
  const i = lessonOrder.indexOf(lessonId);
  if (i <= 0) return true;
  const previous = lessonOrder[i - 1];
  return previous ? Boolean(s.completed[previous]) : true;
}

export function nextLessonId(s: ProgressState): string {
  return (
    lessonOrder.find((id) => !s.completed[id]) ?? lessonOrder[lessonOrder.length - 1] ?? lessonOrder[0] ?? ""
  );
}

export const LEVEL_TITLES = [
  "Student Nurse",
  "Newly Registered",
  "Staff Nurse",
  "Senior Staff Nurse",
  "Charge Nurse",
  "Clinical Specialist",
  "Nurse Practitioner",
  "Nurse Consultant",
];

export function levelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] ?? "Student Nurse",
    intoLevel,
    toNext: XP_PER_LEVEL - intoLevel,
    percent: (intoLevel / XP_PER_LEVEL) * 100,
  };
}

export function weeklyXp(s: ProgressState): number {
  const now = new Date();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    total += s.xpByDay[isoDay(d)] ?? 0;
  }
  return total;
}

export function heartRegenLabel(s: ProgressState): string | null {
  if (s.hearts >= MAX_HEARTS) return null;
  const base = s.heartsUpdatedAt || Date.now();
  const remaining = Math.max(0, base + HEART_REGEN_MS - Date.now());
  const mins = Math.ceil(remaining / 60_000);
  return `${mins} min to next heart`;
}

export function updateReminders(patch: Partial<ReminderSettings>) {
  set((s) => ({ ...s, reminders: { ...s.reminders, ...patch } }));
}

/** Most recent reminder slot that has passed today, if reminders are active. */
export function dueReminderSlot(s: ProgressState, now = new Date()): string | null {
  const r = s.reminders;
  if (!r.enabled || (r.pausedUntil && r.pausedUntil > now.getTime())) return null;
  if (!r.days.includes(now.getDay())) return null;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const passed = [...r.times].sort().filter((t) => t <= hhmm);
  const last = passed[passed.length - 1];
  return last ? `${isoDay(now)}@${last}` : null;
}

export function setDownload(unitId: string, size: number | null) {
  set((s) => {
    const downloads = { ...s.downloads };
    if (size === null) delete downloads[unitId];
    else downloads[unitId] = { size, savedAt: Date.now() };
    return { ...s, downloads };
  });
}

export function saveCoach(coach: CoachState | null) {
  set((s) => ({ ...s, coach }));
}
