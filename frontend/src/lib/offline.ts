import { useEffect, useState } from "react";
import type { Unit } from "@/data/types";
import { setDownload } from "@/lib/progress";

/** Same cache the service worker reads page navigations from. */
export const PAGES_CACHE = "nurseup-pages";

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/** True when a service worker controls the page (published app), so saved lessons open offline. */
export function offlineReady(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && !!navigator.serviceWorker.controller;
}

function unitUrls(unit: Unit): string[] {
  const urls = new Set<string>(["/", "/profile", "/practice", "/leaderboard"]);
  for (const lesson of unit.lessons) {
    urls.add(`/lesson/${lesson.id}`);
    urls.add(`/complete/${lesson.id}`);
    for (const card of lesson.cards) {
      if (card.type === "image") urls.add(card.src);
      if ((card.type === "audio" || card.type === "video") && card.src) urls.add(card.src);
      if (card.type === "video" && card.poster) urls.add(card.poster);
    }
  }
  return [...urls];
}

export async function downloadUnit(unit: Unit): Promise<void> {
  if (typeof caches === "undefined") throw new Error("Offline saving isn't supported in this browser.");
  const cache = await caches.open(PAGES_CACHE);
  let size = 0;
  for (const url of unitUrls(unit)) {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Couldn't save ${url}`);
    const blob = await res.clone().blob();
    size += blob.size;
    await cache.put(url, res);
  }
  setDownload(unit.id, size);
}

export async function removeUnit(unit: Unit): Promise<void> {
  if (typeof caches !== "undefined") {
    const cache = await caches.open(PAGES_CACHE);
    for (const lesson of unit.lessons) {
      await cache.delete(`/lesson/${lesson.id}`);
      await cache.delete(`/complete/${lesson.id}`);
    }
  }
  setDownload(unit.id, null);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
