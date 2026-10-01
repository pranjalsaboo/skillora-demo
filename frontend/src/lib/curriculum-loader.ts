import { supabase } from "@/integrations/supabase/client";
import { CATALOG_CACHE_KEY, applyCurriculum } from "@/data/curriculum";
import type { LessonCard, Question, Unit } from "@/data/types";

/** Fetch the catalog as nurses see it (RLS returns published lessons only for non-staff). */
export async function fetchCatalog(onlyPublished = true): Promise<Unit[]> {
  const [u, l, c, q] = await Promise.all([
    supabase.from("units").select("*").eq("archived", false).order("position"),
    supabase.from("lessons").select("*").order("position"),
    supabase.from("lesson_cards").select("*").order("position"),
    supabase.from("lesson_questions").select("*").order("position"),
  ]);
  const err = u.error ?? l.error ?? c.error ?? q.error;
  if (err) throw err;
  return (u.data ?? [])
    .map((unit) => ({
      id: unit.id,
      title: unit.title,
      blurb: unit.blurb,
      accent: unit.accent as Unit["accent"],
      lessons: (l.data ?? [])
        .filter((x) => x.unit_id === unit.id && (!onlyPublished || x.status === "published"))
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          minutes: lesson.minutes,
          summary: lesson.summary,
          cards: (c.data ?? []).filter((x) => x.lesson_id === lesson.id).map((x) => x.data as unknown as LessonCard),
          questions: (q.data ?? [])
            .filter((x) => x.lesson_id === lesson.id)
            .map((x) => ({ ...(x.data as unknown as Question), id: x.id })),
        })),
    }))
    .filter((unit) => unit.lessons.length > 0);
}

/** Refresh the local catalog; keeps the cached/built-in copy when offline or on error. */
export async function refreshCatalog() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    const units = await fetchCatalog(true);
    if (units.length === 0) return;
    const json = JSON.stringify(units);
    if (localStorage.getItem(CATALOG_CACHE_KEY) === json) return;
    localStorage.setItem(CATALOG_CACHE_KEY, json);
    applyCurriculum(units);
  } catch (e) {
    console.warn("Catalog refresh failed; using saved lessons", e);
  }
}
