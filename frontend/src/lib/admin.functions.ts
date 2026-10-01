import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "has_role" | "is_staff", args: Record<string, string>) => PromiseLike<{ data: unknown }> }; userId: string };

async function assertRole(context: Ctx, role: "admin" | "staff") {
  const { data } =
    role === "admin"
      ? await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" })
      : await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!data) throw new Error("Forbidden");
}

/** Emails + sign-in dates for the Learners and Admins pages (admin only). */
export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context as unknown as Ctx, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error("Couldn't load users");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.["full_name"] as string | undefined) ?? (u.email ?? "").split("@")[0] ?? "",
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ email: z.string().email().max(255), role: z.enum(["admin", "editor", "none"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as unknown as Ctx, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error("Couldn't look up users");
    const user = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user) return { ok: false as const, message: "No Skillora account uses that email yet. Ask them to sign up first." };
    if (user.id === context.userId && data.role !== "admin")
      return { ok: false as const, message: "You can't remove your own admin access." };
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
    if (data.role !== "none") {
      const { error: insErr } = await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: data.role });
      if (insErr) throw new Error("Couldn't save role");
    }
    return { ok: true as const, message: "Saved" };
  });

const MAX_BYTES = 8 * 1024 * 1024;

/** Upload lesson media (image/audio/video) to public storage; staff only. */
export const uploadLessonMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(200),
        type: z.string().regex(/^(image|audio|video)\//),
        base64: z.string().max(Math.ceil((MAX_BYTES * 4) / 3) + 8),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as unknown as Ctx, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = "lesson-media";
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some((b) => b.id === bucket)) {
      await supabaseAdmin.storage.createBucket(bucket, { public: true, fileSizeLimit: MAX_BYTES });
    }
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const safe = data.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-80);
    const path = `${Date.now()}-${safe}`;
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, { contentType: data.type });
    if (error) throw new Error("Upload failed");
    return { url: supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl };
  });
