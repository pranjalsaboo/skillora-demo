/**
 * Tiny synthesized sound effects — no audio files needed.
 * All playback is guarded so SSR and muted browsers are safe.
 */
import { soundOn } from "@/lib/progress";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!soundOn()) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", gain = 0.08) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** Bright two-note chime for a correct answer. */
export function playCorrect() {
  tone(659.25, 0, 0.12);
  tone(987.77, 0.1, 0.22);
}

/** Soft low tone for a wrong answer. */
export function playWrong() {
  tone(196, 0, 0.22, "triangle", 0.06);
  tone(155.56, 0.12, 0.3, "triangle", 0.05);
}

/** Short rising fanfare when a lesson or practice session finishes. */
export function playComplete() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.12, 0.3));
}
