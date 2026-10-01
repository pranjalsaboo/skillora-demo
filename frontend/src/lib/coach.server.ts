import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { allLessons, curriculum } from "@/data/curriculum";

const MODEL = process.env["OPENAI_MODEL"] || "gpt-6-astra";

export type CoachInput = {
  goals: string;
  minutesPerDay: number;
  daysPerWeek: number;
  completed: { lessonId: string; bestAccuracy: number }[];
  mistakeLessonIds: string[];
};

export type CoachPlan = {
  summary: string;
  steps: { lessonId: string; reason: string }[];
  tip: string;
};

export class CoachError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function statusOf(e: unknown): number | undefined {
  const s = (e as { statusCode?: number; status?: number })?.statusCode ?? (e as { status?: number })?.status;
  return typeof s === "number" ? s : undefined;
}

export async function recommendPath(input: CoachInput, apiKey: string): Promise<CoachPlan> {
  const catalog = curriculum
    .flatMap((u) =>
      u.lessons.map((l) => `- id: ${l.id} | unit: ${u.title} | "${l.title}" | ${l.minutes} min | ${l.summary}`),
    )
    .join("\n");
  const done = input.completed.length
    ? input.completed.map((c) => `${c.lessonId} (best ${c.bestAccuracy}%)`).join(", ")
    : "none yet";

  const provider = createOpenAI({ apiKey });

  const system = `You are a supportive clinical education coach for nurses using a microlearning app.
Build a focused lesson path ONLY from the catalog below, using exact lesson ids.
Rules:
- Fit the learner's time: roughly minutesPerDay x daysPerWeek minutes for one week; each lesson lists its minutes.
- Prioritise lessons matching their goals, then lessons with mistakes or best score under 80% (as revision), then new lessons. Skip lessons already done at 100% unless directly relevant.
- 2 to 6 steps. Each reason is one short sentence addressed to the nurse ("you").
- summary: 1-2 warm sentences. tip: one practical study tip fitting shift work.
Reply with ONLY JSON: {"summary": string, "steps": [{"lessonId": string, "reason": string}], "tip": string}

Catalog:
${catalog}`;

  const user = `Goals: ${input.goals.slice(0, 600)}
Study time: ${input.minutesPerDay} min/day, ${input.daysPerWeek} days/week
Completed: ${done}
Lessons with open mistakes: ${input.mistakeLessonIds.join(", ") || "none"}`;

  let text: string;
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      system,
      prompt: user,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    text = await result.text;
  } catch (e) {
    const status = statusOf(e);
    if (status === 429) throw new CoachError("The coach is busy right now. Please try again in a minute.", 429);
    if (status === 402) throw new CoachError("The AI quota for this app has run out. Please try again later.", 402);
    if (status === 403) throw new CoachError("AI recommendations aren't available for this app right now.", 403);
    throw new CoachError("Couldn't reach the coach. Please try again.", status ?? 500);
  }

  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let parsed: Partial<CoachPlan>;
  try {
    parsed = JSON.parse(json) as Partial<CoachPlan>;
  } catch {
    throw new CoachError("The coach gave an unclear answer. Please try again.", 502);
  }
  const valid = new Set(allLessons.map((l) => l.id));
  const seen = new Set<string>();
  const steps = (parsed.steps ?? [])
    .filter((s) => s && valid.has(s.lessonId) && !seen.has(s.lessonId) && seen.add(s.lessonId))
    .slice(0, 6)
    .map((s) => ({ lessonId: s.lessonId, reason: String(s.reason ?? "").slice(0, 240) }));
  if (!steps.length) throw new CoachError("The coach couldn't match any lessons. Try rewording your goals.", 502);
  return {
    summary: String(parsed.summary ?? "").slice(0, 400),
    steps,
    tip: String(parsed.tip ?? "").slice(0, 300),
  };
}
