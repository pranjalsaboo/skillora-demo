import handHygiene from "@/assets/hand-hygiene.jpg";
import type { Unit } from "../types";

export const infectionControl: Unit = {
  id: "infection-control",
  title: "Infection Control",
  blurb: "Break the chain before it reaches the next bed.",
  accent: "sky",
  lessons: [
    {
      id: "ic-1",
      title: "The five moments",
      minutes: 3,
      summary: "When to clean your hands, and why the order matters.",
      cards: [
        {
          type: "image",
          title: "Five moments for hand hygiene",
          src: handHygiene,
          caption:
            "Before touching a patient, before a clean or aseptic procedure, after body fluid exposure risk, after touching a patient, after touching patient surroundings.",
        },
        {
          type: "text",
          title: "Gloves are not a substitute",
          body: "Hands must be cleaned before gloves go on and immediately after they come off. Gloves develop micro-perforations and hands become contaminated during removal.",
          bullets: [
            "Alcohol rub for visibly clean hands, 20–30 seconds",
            "Soap and water for visibly soiled hands and for spore-forming organisms",
            "Bare below the elbow, no stoned rings, short nails",
          ],
        },
        {
          type: "video",
          title: "Walkthrough: a single bedside episode",
          poster: handHygiene,
          steps: [
            { at: "0:00", text: "Hands cleaned on approach — moment one, before touching the patient." },
            { at: "0:15", text: "Hands cleaned again before setting up the sterile field — moment two." },
            { at: "0:34", text: "Cannula removed, gloves off, hands cleaned — moment three." },
            { at: "0:48", text: "After leaving the patient and again after touching the bed table — moments four and five." },
          ],
        },
      ],
      questions: [
        {
          type: "order",
          prompt: "Order the five moments as they occur in a bedside episode.",
          steps: [
            "Before touching a patient",
            "Before a clean or aseptic procedure",
            "After body fluid exposure risk",
            "After touching a patient",
            "After touching patient surroundings",
          ],
          explanation: "The sequence follows the natural flow of a care episode, ending with the patient's immediate environment.",
        },
        {
          type: "boolean",
          prompt: "Wearing gloves removes the need to clean your hands before the procedure.",
          answer: false,
          explanation: "Hands are cleaned before gloves go on and again immediately after removal.",
        },
        {
          type: "choice",
          prompt: "When must soap and water be used rather than alcohol hand rub?",
          options: [
            "Whenever hands feel dry",
            "When hands are visibly soiled or the organism is spore-forming",
            "Only at the start of a shift",
            "Never, alcohol rub is always preferred",
          ],
          answerIndex: 1,
          explanation: "Alcohol does not remove visible soil and is not reliably effective against spores such as C. difficile.",
        },
      ],
    },
  ],
};
