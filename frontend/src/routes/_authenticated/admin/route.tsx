import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "admin" | "editor";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", context.user.id);
    const roles = (data ?? []).map((r) => r.role as StaffRole);
    const role: StaffRole | null = roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : null;
    if (!role) throw redirect({ to: "/" });
    return { role };
  },
  head: () => ({
    meta: [
      { title: "Skillora Admin" },
      { name: "description", content: "Manage Skillora lessons, daily challenges, community and learners." },
      { property: "og:title", content: "Skillora Admin" },
      { property: "og:description", content: "Content and community management for Skillora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});
