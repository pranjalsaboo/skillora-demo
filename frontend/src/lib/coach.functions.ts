import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  goals: z.string().trim().min(3).max(600),
  minutesPerDay: z.number().int().min(3).max(120),
  daysPerWeek: z.number().int().min(1).max(7),
  completed: z.array(z.object({ lessonId: z.string().max(80), bestAccuracy: z.number().min(0).max(100) })).max(200),
  mistakeLessonIds: z.array(z.string().max(80)).max(200),
});

export const getCoachPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { recommendPath, CoachError } = await import("./coach.server");
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "AI isn't set up for this app yet." };
    try {
      return { ok: true as const, plan: await recommendPath(data, apiKey) };
    } catch (e) {
      return { ok: false as const, error: e instanceof CoachError ? e.message : "Something went wrong. Please try again." };
    }
  });
