import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { SyncManager } from "@/components/SyncManager";
import { useCurriculumVersion } from "@/data/curriculum";
import { refreshCatalog } from "@/lib/curriculum-loader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Offline (shifts, commutes): trust the session saved on this device so
    // learning keeps working; the server re-checks it when syncing online.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const { data } = await supabase.auth.getSession();
      if (data.session) return { user: data.session.user };
      throw redirect({ to: "/auth" });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const isNetwork = error && /fetch|network/i.test(error.message);
      if (isNetwork) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session) return { user: s.session.user };
      }
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const catalogVersion = useCurriculumVersion();
  useEffect(() => {
    void refreshCatalog();
    const onFocus = () => void refreshCatalog();
    window.addEventListener("online", onFocus);
    return () => window.removeEventListener("online", onFocus);
  }, []);
  return (
    <>
      <SyncManager userId={user.id} />
      <div key={catalogVersion} className="contents">
        <Outlet />
      </div>
    </>
  );
}
