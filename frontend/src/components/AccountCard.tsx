import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSyncStatus } from "@/lib/sync";
import { useOnline } from "@/lib/offline";

function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

export function AccountCard() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const sync = useSyncStatus();
  const online = useOnline();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const label = !online
    ? sync.phase === "pending"
      ? "Offline — your progress will sync when you reconnect"
      : "Offline — everything is saved on this phone"
    : sync.phase === "syncing"
      ? "Syncing…"
      : sync.phase === "pending"
        ? "Saving your latest progress…"
        : sync.phase === "error"
          ? "Couldn't sync — we'll try again shortly"
          : sync.lastSyncedAt
            ? `Synced ${ago(sync.lastSyncedAt)}`
            : "Synced";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <section className="chunky-card mt-6 border border-border bg-card p-4">
      <h2 className="text-lg font-bold">Account</h2>
      <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
      <p className="mt-3 flex items-center gap-2 text-sm font-medium">
        <span
          className={
            "inline-block h-2 w-2 rounded-full " +
            (sync.phase === "idle" && online ? "bg-primary" : sync.phase === "error" ? "bg-destructive" : "bg-warning")
          }
        />
        {label}
      </p>
      <button
        type="button"
        onClick={signOut}
        className="mt-4 w-full rounded-xl border-2 border-border px-4 py-2.5 text-sm font-semibold"
      >
        Sign out
      </button>
    </section>
  );
}
