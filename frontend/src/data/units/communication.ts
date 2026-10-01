import type { Unit } from "../types";

export const communication: Unit = {
  id: "communication",
  title: "Patient Communication",
  blurb: "Handovers, hard conversations and being heard.",
  accent: "rose",
  lessons: [
    {
      id: "pc-1",
      title: "Handover that sticks",
      minutes: 3,
      summary: "Structure a handover so nothing important falls through.",
      cards: [
        {
          type: "text",
          title: "Structure beats memory",
          body: "An unstructured handover drifts towards whatever happened most recently. A structured one covers the same ground for every patient, so the receiving nurse always knows what to watch for on their shift.",
          bullets: [
            "Identify the patient and the current concern first",
            "State what changed this shift, not the full history",
            "Close with outstanding tasks and who is responsible",
          ],
        },
        {
          type: "audio",
          title: "Listen: read-back",
          durationLabel: "35 sec",
          transcript:
            "For any verbal order or critical result, use read-back. Write it down, read it back to the person who gave it, and have them confirm it. Nine times out of ten it changes nothing. The tenth time it catches a dose that was heard as fifteen milligrams instead of fifty.",
        },
      ],
      questions: [
        {
          type: "order",
          prompt: "Order a structured bedside handover.",
          steps: [
            "Identify the patient and current concern",
            "Summarise relevant background",
            "Share your assessment and latest observations",
            "Agree outstanding tasks and who owns them",
          ],
          explanation: "Situation first, then background, assessment and a clear handover of responsibility.",
        },
        {
          type: "boolean",
          prompt: "Read-back should be used for verbal orders and critical results.",
          answer: true,
          explanation: "Writing it down and reading it back catches mishearing before it reaches the patient.",
        },
      ],
    },
    {
      id: "pc-2",
      title: "Difficult conversations",
      minutes: 4,
      summary: "Hold space for distress without rushing to fix it.",
      cards: [
        {
          type: "text",
          title: "Ask before you tell",
          body: "Find out what the patient already understands before adding information. It prevents you from repeating what they know, contradicting what they have been told, or overwhelming someone who is not ready.",
          bullets: [
            "Warn gently before difficult news",
            "Silence is a tool — let it run for a few seconds",
            "Acknowledge the emotion before offering the plan",
          ],
        },
        {
          type: "audio",
          title: "Listen: what not to say",
          durationLabel: "40 sec",
          transcript:
            "Avoid reaching for reassurance you cannot guarantee. 'I'm sure it will be fine' closes the conversation and can damage trust when it turns out otherwise. Try naming what you see instead: 'This sounds really frightening.' Naming the emotion tells the patient you heard them, and it usually opens the door to what they actually wanted to ask.",
        },
      ],
      questions: [
        {
          type: "choice",
          prompt: "A patient becomes tearful after hearing their discharge is delayed. What is the best first response?",
          options: [
            "Reassure them it will definitely be tomorrow",
            "Acknowledge the emotion and give them space to respond",
            "Change the subject to their medication",
            "Leave and come back later",
          ],
          answerIndex: 1,
          explanation: "Naming and acknowledging the emotion comes before information or problem-solving.",
        },
        {
          type: "boolean",
          prompt: "You should establish what the patient already understands before giving new information.",
          answer: true,
          explanation: "Asking first avoids contradiction, repetition and overwhelming the patient.",
        },
        {
          type: "boolean",
          prompt: "Saying 'I'm sure everything will be fine' is a helpful way to reduce a patient's anxiety.",
          answer: false,
          explanation: "Unfounded reassurance closes the conversation and erodes trust if the outcome differs.",
        },
      ],
    },
  ],
};
