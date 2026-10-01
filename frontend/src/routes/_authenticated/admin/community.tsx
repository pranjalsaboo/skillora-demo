import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Flag, Trash2 } from "lucide-react";
import { AdminCard, AdminShell, AdminsOnly, useStaffRole } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/community")({
  component: CommunityAdmin,
});

async function load() {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .order("report_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

function CommunityAdmin() {
  const role = useStaffRole();
  const qc = useQueryClient();
  const posts = useQuery({ queryKey: ["admin", "community"], queryFn: load, enabled: role === "admin" });
  const [filter, setFilter] = useState<"all" | "reported" | "hidden">("all");

  if (role !== "admin")
    return (
      <AdminShell title="Community">
        <AdminsOnly />
      </AdminShell>
    );

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "community"] });
  async function setHidden(id: string, hidden: boolean) {
    const { error } = await supabase.from("community_posts").update({ hidden }).eq("id", id);
    if (error) toast.error("Couldn't update post");
    else toast.success(hidden ? "Post hidden from nurses" : "Post visible again");
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) toast.error("Couldn't delete post");
    refresh();
  }

  const rows = (posts.data ?? []).filter((p) =>
    filter === "reported" ? p.report_count > 0 : filter === "hidden" ? p.hidden : true,
  );

  return (
    <AdminShell
      title="Community"
      subtitle="Reported posts appear first"
      actions={
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["all", "reported", "hidden"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("rounded-md px-3 py-1 text-sm font-medium capitalize", filter === f ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              {f}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-3">
        {rows.length === 0 && posts.data && <AdminCard className="py-10 text-center text-muted-foreground">Nothing to review.</AdminCard>}
        {rows.map((p) => (
          <AdminCard key={p.id} className={cn("flex gap-4", p.hidden && "opacity-60")}>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{p.author_name}</span>
                <span className="capitalize">· {p.kind}</span>
                <span>· {new Date(p.created_at).toLocaleString()}</span>
                {p.report_count > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-heart/15 px-2 py-0.5 font-semibold text-heart">
                    <Flag className="size-3" /> {p.report_count} report{p.report_count > 1 ? "s" : ""}
                  </span>
                )}
                {p.hidden && <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">Hidden</span>}
              </div>
              <p className="whitespace-pre-wrap text-sm">{p.body}</p>
            </div>
            <div className="flex shrink-0 items-start gap-1">
              <Button size="sm" variant="outline" onClick={() => setHidden(p.id, !p.hidden)}>
                {p.hidden ? <Eye /> : <EyeOff />} {p.hidden ? "Unhide" : "Hide"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)} aria-label="Delete">
                <Trash2 />
              </Button>
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminShell>
  );
}
