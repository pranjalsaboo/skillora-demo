import woundStages from "@/assets/wound-stages.jpg";
import type { Unit } from "../types";

export const woundCare: Unit = {
  id: "wound-care",
  title: "Wound Care",
  blurb: "Stage it right, dress it right, prevent the next one.",
  accent: "amber",
  lessons: [
    {
      id: "wc-1",
      title: "Staging pressure injuries",
      minutes: 4,
      summary: "Tell the four stages apart and know what cannot be staged.",
      cards: [
        {
          type: "image",
          title: "Stages one to four",
          src: woundStages,
          caption:
            "Stage 1: intact skin, non-blanchable redness. Stage 2: partial-thickness loss. Stage 3: full-thickness, fat visible. Stage 4: exposed muscle, bone or tendon.",
        },
        {
          type: "text",
          title: "The blanch test",
          body: "Press lightly on the reddened area for three seconds and release. Skin that stays red is non-blanchable and indicates a stage 1 pressure injury. On darker skin tones, look for changes in temperature, firmness and a purple or maroon hue rather than redness.",
          bullets: [
            "Never reverse-stage a healing wound",
            "A wound covered in slough or eschar is unstageable until the base is visible",
            "Reposition at least two-hourly for at-risk patients",
          ],
        },
        {
          type: "audio",
          title: "Listen: the heel everyone misses",
          durationLabel: "40 sec",
          transcript:
            "Heels carry almost no subcutaneous padding, so pressure injuries there can move from intact skin to deep tissue damage within hours. Float the heels off the mattress with a pillow under the calves, keeping the knees slightly flexed. Check them at every repositioning, not only at the daily skin assessment.",
        },
      ],
      questions: [
        {
          type: "choice",
          prompt: "A sacral wound shows full-thickness skin loss with visible subcutaneous fat, no exposed bone. What stage?",
          options: ["Stage 1", "Stage 2", "Stage 3", "Stage 4"],
          answerIndex: 2,
          explanation: "Visible fat with no exposed muscle, tendon or bone is stage 3.",
        },
        {
          type: "boolean",
          prompt: "A wound whose base is completely covered by eschar can be accurately staged as stage 4.",
          answer: false,
          explanation: "If the base cannot be seen, the wound is unstageable until the slough or eschar is removed.",
        },
        {
          type: "boolean",
          prompt: "As a stage 3 injury heals it should be re-documented as stage 2, then stage 1.",
          answer: false,
          explanation: "Pressure injuries are never reverse-staged. Document it as a healing stage 3.",
        },
        {
          type: "choice",
          prompt: "How should heels be protected in a bedbound at-risk patient?",
          options: [
            "Rub them with barrier cream hourly",
            "Float them off the mattress with a pillow under the calves",
            "Place a ring cushion under each heel",
            "Keep the knees fully extended",
          ],
          answerIndex: 1,
          explanation: "Offloading the heel entirely is the only reliable protection. Ring cushions concentrate pressure.",
        },
      ],
    },
  ],
};
