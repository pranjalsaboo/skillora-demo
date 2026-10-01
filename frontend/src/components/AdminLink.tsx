import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Shown on Profile only to admins/editors. Opens the desktop admin area. */
export function AdminLink() {
  const role = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return data?.[0]?.role ?? null;
    },
  });
  if (!role.data) return null;
  return (
    <Link
      to="/admin"
      className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-secondary p-4"
    >
      <ShieldCheck className="size-5 text-primary" />
      <div className="flex-1">
        <p className="font-bold">Skillora Admin</p>
        <p className="text-xs text-muted-foreground">Manage lessons, challenges and community (desktop)</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
