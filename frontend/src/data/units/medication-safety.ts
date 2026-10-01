import medRights from "@/assets/med-rights.jpg";
import type { Unit } from "../types";

export const medicationSafety: Unit = {
  id: "medication-safety",
  title: "Medication Safety",
  blurb: "Right patient, right drug, every single time.",
  accent: "violet",
  lessons: [
    {
      id: "ms-1",
      title: "The rights of administration",
      minutes: 3,
      summary: "The checklist that catches errors before they reach the patient.",
      cards: [
        {
          type: "image",
          title: "The rights, at a glance",
          src: medRights,
          caption:
            "Patient, medication, dose, route, time, documentation, assessment, education, evaluation and the right to refuse.",
        },
        {
          type: "text",
          title: "Two identifiers, always",
          body: "Confirm identity with two identifiers taken from the patient where possible — full name and date of birth — and match them against the wristband and the chart. Never use bed number or the name above the bed.",
          bullets: [
            "Ask an open question: 'Can you tell me your full name?'",
            "Check allergies before every administration, not just the first",
            "A refusal is a right — record it and inform the prescriber",
          ],
        },
        {
          type: "audio",
          title: "Listen: the interruption trap",
          durationLabel: "40 sec",
          transcript:
            "Most medication errors happen during an interruption. If you are stopped mid-preparation, restart the check from the beginning rather than resuming where you think you left off. Say out loud that you are in the middle of a drug round. The few seconds it costs are far cheaper than the incident form.",
        },
      ],
      questions: [
        {
          type: "choice",
          prompt: "Which pair is acceptable as patient identifiers before administration?",
          options: [
            "Bed number and diagnosis",
            "Full name and date of birth",
            "First name and room number",
            "The name written on the whiteboard",
          ],
          answerIndex: 1,
          explanation: "Two patient-specific identifiers such as full name and date of birth, checked against the wristband.",
        },
        {
          type: "boolean",
          prompt: "If you are interrupted while preparing a medication, it is safest to restart the checks from the beginning.",
          answer: true,
          explanation: "Interruptions are the single biggest contributor to administration errors. Restart the check.",
        },
        {
          type: "choice",
          prompt: "A patient declines their evening antihypertensive. What do you do?",
          options: [
            "Administer it anyway, it is prescribed",
            "Hide it in food",
            "Respect the refusal, document it and inform the prescriber",
            "Record it as given",
          ],
          answerIndex: 2,
          explanation: "The right to refuse is one of the rights. Explore the reason, document and escalate to the prescriber.",
        },
      ],
    },
    {
      id: "ms-2",
      title: "High-alert medications",
      minutes: 4,
      summary: "The small group of drugs that cause most serious harm.",
      cards: [
        {
          type: "text",
          title: "What makes a drug high-alert",
          body: "High-alert medications are not more likely to be given in error — they are more likely to cause severe harm when an error happens. Insulin, anticoagulants, opioids, concentrated electrolytes and chemotherapy sit at the top of most lists.",
          bullets: [
            "Independent double-check by a second registered nurse",
            "Never abbreviate 'units' — write it in full",
            "Store concentrated potassium away from the general stock",
          ],
        },
        {
          type: "audio",
          title: "Listen: independent means independent",
          durationLabel: "35 sec",
          transcript:
            "An independent double-check only works when the second nurse calculates the dose without being told your answer. If you hand over the syringe and say 'that's eight units, yes?', you have not had a check — you have had an agreement. Give them the chart and the vial, and let them work it out.",
        },
      ],
      questions: [
        {
          type: "boolean",
          prompt: "An independent double-check means the second nurse verifies the dose without being told your calculation first.",
          answer: true,
          explanation: "Telling them your answer introduces confirmation bias and removes the value of the check.",
        },
        {
          type: "choice",
          prompt: "Which of these is classed as a high-alert medication?",
          options: ["Paracetamol", "Insulin", "Simple linctus", "Sodium chloride 0.9% flush"],
          answerIndex: 1,
          explanation: "Insulin is high-alert: small dosing errors can cause severe hypoglycaemia.",
        },
        {
          type: "boolean",
          prompt: "Writing 'U' instead of 'units' on an insulin chart is acceptable when the handwriting is clear.",
          answer: false,
          explanation: "'U' is routinely misread as a zero, turning 8 units into 80. Always write 'units' in full.",
        },
      ],
    },
  ],
};
