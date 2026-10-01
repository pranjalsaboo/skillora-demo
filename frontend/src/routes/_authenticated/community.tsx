import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Flag, Heart, Trash2, Lightbulb, Mountain, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — Skillora" },
      { name: "description", content: "Share study tips, challenges and progress with fellow nurses learning on Skillora." },
      { property: "og:title", content: "Community — Skillora" },
      { property: "og:description", content: "A feed where nurses share study tips, challenges and wins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

type Kind = "tip" | "challenge" | "progress";
const KINDS: { id: Kind; label: string; Icon: typeof Lightbulb; placeholder: string }[] = [
  { id: "tip", label: "Study tip", Icon: Lightbulb, placeholder: "What helps you remember things on shift?" },
  { id: "challenge", label: "Challenge", Icon: Mountain, placeholder: "What are you finding tricky right now?" },
  { id: "progress", label: "Progress", Icon: TrendingUp, placeholder: "Share a win — big or small!" },
];

type Post = {
  id: string;
  user_id: string;
  author_name: string;
  kind: Kind;
  body: string;
  created_at: string;
  cheers: number;
  cheered: boolean;
};

async function fetchFeed(): Promise<{ posts: Post[]; me: string | null }> {
  const { data: session } = await supabase.auth.getSession();
  const me = session.session?.user.id ?? null;
  const { data, error } = await supabase
    .from("community_posts")
    .select("id,user_id,author_name,kind,body,created_at,community_cheers(user_id)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const posts = (data ?? []).map((p) => {
    const cheers = (p.community_cheers ?? []) as { user_id: string }[];
    return {
      id: p.id,
      user_id: p.user_id,
      author_name: p.author_name,
      kind: p.kind as Kind,
      body: p.body,
      created_at: p.created_at,
      cheers: cheers.length,
      cheered: cheers.some((c) => c.user_id === me),
    };
  });
  return { posts, me };
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function CommunityPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [kind, setKind] = useState<Kind>("tip");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const feed = useQuery({ queryKey: ["community"], queryFn: fetchFeed });

  const refresh = () => qc.invalidateQueries({ queryKey: ["community"] });

  async function submit() {
    const text = body.trim();
    if (!text) return;
    if (!navigator.onLine) { toast.error("You're offline — try again when connected."); return; }
    setPosting(true);
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setPosting(false);
      return;
    }
    const meta = user.user_metadata as Record<string, unknown>;
    const name =
      (typeof meta["full_name"] === "string" && meta["full_name"]) ||
      (typeof meta["name"] === "string" && meta["name"]) ||
      (user.email ?? "Nurse").split("@")[0] ||
      "Nurse";
    const { error } = await supabase
      .from("community_posts")
      .insert({ user_id: user.id, author_name: String(name).slice(0, 40), kind, body: text.slice(0, 500) });
    setPosting(false);
    if (error) { toast.error("Couldn't share your post."); return; }
    setBody("");
    toast.success("Shared with the community");
    refresh();
  }

  async function toggleCheer(p: Post, me: string) {
    const { error } = p.cheered
      ? await supabase.from("community_cheers").delete().eq("post_id", p.id).eq("user_id", me)
      : await supabase.from("community_cheers").insert({ post_id: p.id, user_id: me });
    if (error) toast.error("Couldn't update cheer.");
    refresh();
  }

  async function report(p: Post, me: string) {
    const { error } = await supabase.from("community_reports").insert({ post_id: p.id, user_id: me });
    if (error) {
      toast.message(error.code === "23505" ? "You've already reported this post." : "Couldn't send report.");
      return;
    }
    toast.success("Thanks — our team will review it.");
  }

  async function remove(p: Post) {
    const { error } = await supabase.from("community_posts").delete().eq("id", p.id);
    if (error) { toast.error("Couldn't delete post."); return; }
    refresh();
  }

  const active = KINDS.find((k) => k.id === kind)!;
  const posts = (feed.data?.posts ?? []).filter((p) => filter === "all" || p.kind === filter);
  const me = feed.data?.me ?? null;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Community</h1>
      <p className="mb-5 text-sm text-muted-foreground">Share tips, challenges and wins with fellow nurses.</p>

      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex gap-2">
          {KINDS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setKind(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                kind === id ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={active.placeholder}
          className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">{body.length}/500</span>
          <button
            onClick={submit}
            disabled={posting || !body.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {posting ? "Sharing…" : "Share"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {([{ id: "all", label: "All" }, ...KINDS] as const).map((k) => (
          <button
            key={k.id}
            onClick={() => setFilter(k.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
              filter === k.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      {feed.isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading feed…</p>}
      {feed.isError && (
        <p className="py-10 text-center text-sm text-muted-foreground">Couldn't load the feed. Check your connection.</p>
      )}
      {feed.data && posts.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">No posts yet — be the first to share!</p>
      )}

      <ul className="space-y-3">
        {posts.map((p) => {
          const k = KINDS.find((x) => x.id === p.kind) ?? KINDS[0]!;
          return (
            <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                  {p.author_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.author_name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <k.Icon className="size-3" /> {k.label} · {timeAgo(p.created_at)}
                  </p>
                </div>
                {me === p.user_id && (
                  <button onClick={() => remove(p)} aria-label="Delete post" className="p-1 text-muted-foreground">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{p.body}</p>
              <button
                onClick={() => me && toggleCheer(p, me)}
                className={cn(
                  "mt-3 inline-flex items-center gap-1.5 text-xs font-semibold",
                  p.cheered ? "text-heart" : "text-muted-foreground",
                )}
              >
                <Heart className={cn("size-4", p.cheered && "fill-current")} />
                {p.cheers > 0 ? p.cheers : "Cheer"}
              </button>
              {me && me !== p.user_id && (
                <button
                  onClick={() => report(p, me)}
                  className="mt-3 ml-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                >
                  <Flag className="size-3.5" /> Report
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
