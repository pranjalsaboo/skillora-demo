import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  getProgressState,
  onProgressChange,
  replaceProgress,
  defaultState,
  type ProgressState,
} from "@/lib/progress";

const DIRTY_KEY = "nurseup.sync.dirty";
const OWNER_KEY = "nurseup.progress.owner";

export type SyncStatus = {
  phase: "idle" | "syncing" | "pending" | "error";
  lastSyncedAt: number | null;
};

let status: SyncStatus = { phase: "idle", lastSyncedAt: null };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

function isDirty() {
  try {
    return localStorage.getItem(DIRTY_KEY) === "1";
  } catch {
    return false;
  }
}
function setDirty(v: boolean) {
  try {
    if (v) localStorage.setItem(DIRTY_KEY, "1");
    else localStorage.removeItem(DIRTY_KEY);
  } catch {
    /* ignore */
  }
}

/** Merges two copies of progress so nothing earned on either device is lost. */
export function mergeProgress(local: ProgressState, remote: ProgressState): ProgressState {
  const newer = (local.updatedAt ?? 0) >= (remote.updatedAt ?? 0) ? local : remote;
  const older = newer === local ? remote : local;
  // A reset made after the other copy was last touched wins outright.
  if (newer.resetAt && newer.resetAt >= (older.updatedAt ?? 0)) return newer;

  const completed = { ...older.completed };
  for (const [id, rec] of Object.entries(newer.completed)) {
    const prev = completed[id];
    completed[id] = prev
      ? {
          bestAccuracy: Math.max(prev.bestAccuracy, rec.bestAccuracy),
          attempts: Math.max(prev.attempts, rec.attempts),
          completedAt: Math.max(prev.completedAt, rec.completedAt),
        }
      : rec;
  }
  const xpByDay = { ...older.xpByDay };
  for (const [day, xp] of Object.entries(newer.xpByDay)) {
    xpByDay[day] = Math.max(xpByDay[day] ?? 0, xp);
  }
  return {
    ...newer,
    xp: Math.max(local.xp, remote.xp),
    completed,
    xpByDay,
  };
}

let running: { userId: string; inFlight: Promise<void> | null } | null = null;

async function syncNow(userId: string, announce = false) {
  if (!running || running.userId !== userId) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus({ phase: isDirty() ? "pending" : "idle" });
    return;
  }
  if (running.inFlight) return running.inFlight;
  const wasDirty = isDirty();
  const job = (async () => {
    setStatus({ phase: "syncing" });
    try {
      const { data, error } = await supabase
        .from("learner_progress")
        .select("state")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      const local = getProgressState();
      let merged = local;
      if (data?.state && typeof data.state === "object") {
        const remote = { ...defaultState, ...(data.state as unknown as ProgressState) };
        merged = mergeProgress(local, remote);
        // Downloads and reminder bookkeeping belong to this device only.
        merged = {
          ...merged,
          downloads: local.downloads,
          reminders: { ...merged.reminders, lastFired: local.reminders.lastFired, dismissed: local.reminders.dismissed },
        };
        if (JSON.stringify(merged) !== JSON.stringify(local)) replaceProgress(merged);
      }
      const { downloads: _d, ...toSave } = getProgressState();
      const { error: upErr } = await supabase.from("learner_progress").upsert({
        user_id: userId,
        state: toSave as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (upErr) throw upErr;
      setDirty(false);
      setStatus({ phase: "idle", lastSyncedAt: Date.now() });
      if (announce && wasDirty) toast.success("Back online — your offline progress is synced");
    } catch (e) {
      console.error("Sync failed", e);
      setStatus({ phase: isDirty() ? "pending" : "error" });
    }
  })();
  running.inFlight = job;
  try {
    await job;
  } finally {
    if (running) running.inFlight = null;
  }
}

/** Starts background syncing for a signed-in user. Returns a cleanup function. */
export function startSync(userId: string): () => void {
  // Progress on this device belonged to someone else — start them fresh.
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== userId) {
      const local = getProgressState();
      replaceProgress({ ...defaultState, sound: local.sound, downloads: local.downloads, updatedAt: 0 });
      setDirty(false);
    }
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* ignore */
  }

  running = { userId, inFlight: null };
  let timer: ReturnType<typeof setTimeout> | undefined;

  const offChange = onProgressChange(() => {
    setDirty(true);
    setStatus({ phase: "pending" });
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(userId), 2000);
  });
  const onOnline = () => void syncNow(userId, true);
  const onVisible = () => {
    if (document.visibilityState === "visible") void syncNow(userId);
  };
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);

  if (isDirty()) setStatus({ phase: "pending" });
  void syncNow(userId, true);

  return () => {
    clearTimeout(timer);
    offChange();
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
    running = null;
  };
}
