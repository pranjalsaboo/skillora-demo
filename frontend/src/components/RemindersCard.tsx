import { useEffect, useState } from "react";
import { BellRing, Pause, Play, Plus, X } from "lucide-react";
import {
  PAUSE_FOREVER,
  SHIFT_PRESETS,
  updateReminders,
  useProgress,
  type ShiftPattern,
} from "@/lib/progress";
import { cn } from "@/lib/utils";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY = 86_400_000;

export function RemindersCard() {
  const { reminders: r } = useProgress();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const toggle = async () => {
    if (r.enabled) return updateReminders({ enabled: false });
    updateReminders({ enabled: true, pausedUntil: null });
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      setPerm(await Notification.requestPermission());
    }
  };

  const pickShift = (shift: ShiftPattern) =>
    updateReminders(shift === "custom" ? { shift } : { shift, times: SHIFT_PRESETS[shift].times });

  const setTime = (i: number, value: string) => {
    const times = [...r.times];
    times[i] = value;
    updateReminders({ times, shift: "custom" });
  };

  const paused = r.pausedUntil && r.pausedUntil > Date.now();
  const pausedLabel = paused
    ? r.pausedUntil === PAUSE_FOREVER
      ? "Paused until you resume"
      : `Paused until ${new Date(r.pausedUntil!).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`
    : null;

  const chip = (active: boolean) =>
    cn(
      "rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors",
      active ? "border-primary bg-secondary text-primary" : "border-border bg-card text-muted-foreground",
    );

  return (
    <section className="chunky-card mt-5 border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <BellRing className="size-4.5 text-primary" /> Learning reminders
          </h2>
          <p className="text-sm text-muted-foreground">A gentle nudge that fits around your shifts. Optional.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={r.enabled}
          aria-label="Learning reminders"
          onClick={() => void toggle()}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors",
            r.enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-1 size-5 rounded-full bg-card shadow transition-all",
              r.enabled ? "left-6" : "left-1",
            )}
          />
        </button>
      </div>

      {r.enabled && (
        <div className="mt-4 space-y-4">
          {perm === "denied" && (
            <p className="rounded-xl bg-heart/10 p-3 text-sm">
              Notifications are blocked for this site. Allow them in your browser or phone settings — until then
              you'll see reminders as a banner when you open Skillora.
            </p>
          )}

          {pausedLabel ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3">
              <p className="text-sm font-semibold">{pausedLabel}</p>
              <button
                type="button"
                onClick={() => updateReminders({ pausedUntil: null })}
                className="chunky inline-flex items-center gap-1.5 bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
              >
                <Play className="size-4" /> Resume
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Pause className="size-4" /> Pause reminders
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "1 day", ms: DAY },
                  { label: "3 days", ms: 3 * DAY },
                  { label: "1 week", ms: 7 * DAY },
                  { label: "Until I resume", ms: null },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => updateReminders({ pausedUntil: p.ms ? Date.now() + p.ms : PAUSE_FOREVER })}
                    className="rounded-xl border-2 border-border px-2 py-2 text-xs font-bold text-muted-foreground"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold">My shifts</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["day", "night", "rotating", "custom"] as const).map((s) => (
                <button key={s} type="button" onClick={() => pickShift(s)} className={chip(r.shift === s)}>
                  {s === "custom" ? "Custom" : SHIFT_PRESETS[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Remind me at</p>
            <div className="flex flex-wrap items-center gap-2">
              {r.times.map((t, i) => (
                <div key={i} className="flex items-center gap-1 rounded-xl border-2 border-border px-2 py-1">
                  <input
                    type="time"
                    value={t}
                    aria-label={`Reminder time ${i + 1}`}
                    onChange={(e) => setTime(i, e.target.value)}
                    className="bg-transparent text-sm font-bold tabular-nums outline-none"
                  />
                  {r.times.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove time"
                      onClick={() => updateReminders({ times: r.times.filter((_, j) => j !== i), shift: "custom" })}
                    >
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
              {r.times.length < 3 && (
                <button
                  type="button"
                  onClick={() => updateReminders({ times: [...r.times, "12:00"], shift: "custom" })}
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-dashed border-border px-3 py-2 text-sm font-semibold text-muted-foreground"
                >
                  <Plus className="size-4" /> Add time
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">On these days</p>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d, i) => {
                const on = r.days.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      updateReminders({ days: on ? r.days.filter((x) => x !== i) : [...r.days, i].sort() })
                    }
                    className={cn(chip(on), "px-0")}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Skipped on days you've already hit your goal. Reminders show while Skillora is open or installed on your
            phone.
          </p>
        </div>
      )}
    </section>
  );
}
