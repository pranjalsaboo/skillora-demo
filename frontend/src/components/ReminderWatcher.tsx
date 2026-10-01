import { useEffect } from "react";
import { dueReminderSlot, updateReminders, useProgress } from "@/lib/progress";

/** Fires the day's reminder notification while the app is open (no server push yet). */
export function ReminderWatcher() {
  const progress = useProgress();

  useEffect(() => {
    const check = async () => {
      const slot = dueReminderSlot(progress);
      if (!slot || slot === progress.reminders.lastFired) return;
      updateReminders({ lastFired: slot });
      if (progress.lessonsToday >= progress.dailyGoal) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const body =
        progress.streak > 0
          ? `5 minutes for a quick lesson? Your streak is at ${progress.streak}.`
          : "5 minutes for a quick lesson between tasks?";
      try {
        const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
        if (reg) await reg.showNotification("Skillora", { body, icon: "/icon-192.png", tag: "nurseup-reminder" });
        else new Notification("Skillora", { body, icon: "/icon-192.png", tag: "nurseup-reminder" });
      } catch {
        /* notifications unavailable; the home banner still shows */
      }
    };
    void check();
    const timer = setInterval(() => void check(), 30_000);
    const onVis = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [progress]);

  return null;
}
