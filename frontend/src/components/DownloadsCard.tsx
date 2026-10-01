import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Loader2, Trash2 } from "lucide-react";
import { curriculum } from "@/data/curriculum";
import type { Unit } from "@/data/types";
import { useProgress } from "@/lib/progress";
import { downloadUnit, formatSize, removeUnit, useOnline } from "@/lib/offline";

export function useUnitDownload() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (unit: Unit, remove = false) => {
    setBusy(unit.id);
    try {
      if (remove) await removeUnit(unit);
      else {
        await downloadUnit(unit);
        toast.success(`${unit.title} saved for offline`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed — check your connection.");
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

export function DownloadsCard() {
  const { downloads } = useProgress();
  const online = useOnline();
  const { busy, run } = useUnitDownload();
  const total = Object.values(downloads).reduce((n, d) => n + d.size, 0);
  const missing = curriculum.filter((u) => !downloads[u.id]);

  const downloadAll = async () => {
    for (const u of missing) await run(u);
  };

  return (
    <section className="chunky-card mt-5 border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Download className="size-4.5 text-primary" /> Downloads
          </h2>
          <p className="text-sm text-muted-foreground">
            Save units to keep learning on shift or on the commute without internet.
            {total > 0 && ` Using ${formatSize(total)}.`}
          </p>
        </div>
        {missing.length > 0 && (
          <button
            type="button"
            disabled={!online || busy !== null}
            onClick={() => void downloadAll()}
            className="chunky shrink-0 bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Download all
          </button>
        )}
      </div>

      <ul className="mt-4 divide-y divide-border">
        {curriculum.map((unit) => {
          const d = downloads[unit.id];
          return (
            <li key={unit.id} className="flex items-center gap-3 py-3">
              {d ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" />
              ) : (
                <Download className="size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{unit.title}</p>
                <p className="text-xs text-muted-foreground">
                  {unit.lessons.length} lesson{unit.lessons.length === 1 ? "" : "s"}
                  {d ? ` · ${formatSize(d.size)} · available offline` : ""}
                </p>
              </div>
              {busy === unit.id ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : d ? (
                <button
                  type="button"
                  onClick={() => void run(unit, true)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="size-4" /> Remove
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!online || busy !== null}
                  onClick={() => void run(unit)}
                  className="rounded-lg border-2 border-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                >
                  Download
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Your XP, streak and mistakes always save on this phone, online or not. Offline mode works in the published
        app, and you can add Skillora to your home screen.
      </p>
    </section>
  );
}
