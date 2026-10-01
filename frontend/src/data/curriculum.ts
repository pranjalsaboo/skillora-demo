import { useSyncExternalStore } from "react";
import { vitalSigns } from "./units/vital-signs";
import { medicationSafety } from "./units/medication-safety";
import { infectionControl } from "./units/infection-control";
import { woundCare } from "./units/wound-care";
import { communication } from "./units/communication";
import type { Lesson, Unit } from "./types";

/**
 * Built-in lessons are the first-load / offline fallback. Once the published
 * catalog is fetched from the admin-managed tables (see curriculum-loader.ts)
 * these arrays are replaced in place, so every existing import keeps working.
 */
const builtIn: Unit[] = [vitalSigns, medicationSafety, infectionControl, woundCare, communication];

export const curriculum: Unit[] = [...builtIn];
export const allLessons: Lesson[] = curriculum.flatMap((u) => u.lessons);
export const lessonOrder: string[] = allLessons.map((l) => l.id);

export const CATALOG_CACHE_KEY = "skillora.catalog.v1";

let version = 0;
const listeners = new Set<() => void>();

export function applyCurriculum(units: Unit[]) {
  if (units.length === 0) return;
  curriculum.splice(0, curriculum.length, ...units);
  allLessons.splice(0, allLessons.length, ...units.flatMap((u) => u.lessons));
  lessonOrder.splice(0, lessonOrder.length, ...allLessons.map((l) => l.id));
  version++;
  listeners.forEach((l) => l());
}

export function useCurriculumVersion() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0,
  );
}

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (raw) applyCurriculum(JSON.parse(raw) as Unit[]);
  } catch {
    /* ignore corrupt cache */
  }
}

export function getLesson(id: string): Lesson | undefined {
  return allLessons.find((l) => l.id === id);
}

export function getUnitForLesson(id: string): Unit | undefined {
  return curriculum.find((u) => u.lessons.some((l) => l.id === id));
}

export function getNextLessonId(id: string): string | undefined {
  const i = lessonOrder.indexOf(id);
  return i >= 0 ? lessonOrder[i + 1] : undefined;
}

export const accentClasses: Record<Unit["accent"], { bg: string; text: string; ring: string }> = {
  teal: { bg: "bg-primary", text: "text-primary", ring: "ring-primary/30" },
  violet: { bg: "bg-unit-violet", text: "text-unit-violet", ring: "ring-unit-violet/30" },
  amber: { bg: "bg-unit-amber", text: "text-unit-amber", ring: "ring-unit-amber/30" },
  rose: { bg: "bg-unit-rose", text: "text-unit-rose", ring: "ring-unit-rose/30" },
  sky: { bg: "bg-unit-sky", text: "text-unit-sky", ring: "ring-unit-sky/30" },
};
