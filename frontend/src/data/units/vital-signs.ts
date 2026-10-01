import vitalsRanges from "@/assets/vitals-ranges.jpg";
import type { Unit } from "../types";

export const vitalSigns: Unit = {
  id: "vital-signs",
  title: "Vital Signs",
  blurb: "Read, interpret and escalate the numbers that matter.",
  accent: "teal",
  lessons: [
    {
      id: "vs-1",
      title: "Normal adult ranges",
      minutes: 3,
      summary: "The baseline numbers you compare every reading against.",
      cards: [
        {
          type: "text",
          title: "Why ranges are a starting point",
          body: "Normal ranges describe a resting, healthy adult. A reading outside the range is a prompt to look closer, not an automatic emergency — and a reading inside the range can still be abnormal for that patient.",
          bullets: [
            "Always compare against the patient's own baseline",
            "Trend over three readings beats a single number",
            "Document the value, the time and what you did next",
          ],
        },
        {
          type: "image",
          title: "Adult reference ranges",
          src: vitalsRanges,
          caption:
            "Heart rate 60–100 bpm, blood pressure 90/60–120/80 mmHg, temperature 36.1–37.2 °C, respiratory rate 12–20 breaths/min.",
        },
        {
          type: "audio",
          title: "Listen: the number nurses skip",
          durationLabel: "45 sec",
          transcript:
            "Respiratory rate is the most predictive vital sign and the most often estimated. Count for a full sixty seconds when the patient looks unwell. A rate above twenty, or below twelve, is often the earliest sign of deterioration, appearing hours before blood pressure falls. Count it, don't guess it.",
        },
      ],
      questions: [
        {
          type: "choice",
          prompt: "Which resting heart rate is within the normal adult range?",
          options: ["48 bpm", "72 bpm", "108 bpm", "124 bpm"],
          answerIndex: 1,
          explanation: "Normal resting adult heart rate is 60–100 bpm, so 72 bpm sits comfortably inside it.",
        },
        {
          type: "boolean",
          prompt: "A respiratory rate of 22 breaths per minute in a resting adult is within normal limits.",
          answer: false,
          explanation: "Normal is 12–20. A rate of 22 is raised and is often the earliest sign of deterioration.",
        },
        {
          type: "choice",
          prompt: "A patient's usual blood pressure is 150/90. Today it reads 118/74. What is the best response?",
          options: [
            "Record it as normal and move on",
            "Recheck, assess the patient and consider recent medication changes",
            "Withhold all further observations",
            "Call the rapid response team immediately",
          ],
          answerIndex: 1,
          explanation:
            "The value is inside the population range but well below this patient's baseline. Recheck and look for a cause such as a new antihypertensive or dehydration.",
        },
        {
          type: "boolean",
          prompt: "A single out-of-range reading should always be interpreted alongside the patient's trend and clinical picture.",
          answer: true,
          explanation: "Trends and how the patient looks carry more weight than any isolated number.",
        },
      ],
    },
    {
      id: "vs-2",
      title: "Spotting deterioration early",
      minutes: 4,
      summary: "Use track-and-trigger scoring to act before a patient crashes.",
      cards: [
        {
          type: "text",
          title: "Early warning scores",
          body: "Track-and-trigger tools add up how far each vital sign sits from normal. The total tells you how often to observe and who to call. The power is in the total — three mildly abnormal signs are more worrying than one dramatic outlier.",
          bullets: [
            "Score every observation set, not just the worrying ones",
            "A rising score over two sets is an escalation in itself",
            "New confusion counts, even with normal numbers",
          ],
        },
        {
          type: "video",
          title: "Walkthrough: escalating a rising score",
          poster: vitalsRanges,
          steps: [
            { at: "0:00", text: "Full observation set taken, including respiratory rate over a full minute." },
            { at: "0:18", text: "Score calculated and compared with the previous two sets." },
            { at: "0:35", text: "Score has risen from 2 to 5 — the nurse in charge is informed straight away." },
            { at: "0:52", text: "SBAR handover given, observation frequency increased, response documented." },
          ],
        },
        {
          type: "text",
          title: "SBAR in one breath",
          body: "Situation, Background, Assessment, Recommendation. Say who you are and who the patient is, what changed, what you think is happening, and exactly what you want the responder to do.",
        },
      ],
      questions: [
        {
          type: "order",
          prompt: "Put the escalation steps in order.",
          steps: [
            "Complete a full set of observations",
            "Calculate the early warning score",
            "Escalate using SBAR to the responsible clinician",
            "Increase observation frequency and document the response",
          ],
          explanation: "Measure, score, escalate, then re-observe and document. Skipping the score loses the trend.",
        },
        {
          type: "boolean",
          prompt: "New-onset confusion should be escalated even when all recorded vital signs are normal.",
          answer: true,
          explanation: "Acute confusion is an independent red flag and is scored in most track-and-trigger tools.",
        },
        {
          type: "choice",
          prompt: "What does the R in SBAR stand for?",
          options: ["Review", "Recommendation", "Response", "Rationale"],
          answerIndex: 1,
          explanation: "Recommendation — you state clearly what you need the responder to do and by when.",
        },
      ],
    },
  ],
};
