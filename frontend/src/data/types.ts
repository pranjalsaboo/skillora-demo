export type TextCard = {
  type: "text";
  title: string;
  body: string;
  bullets?: string[];
};

export type ImageCard = {
  type: "image";
  title: string;
  src: string;
  caption: string;
};

export type AudioCard = {
  type: "audio";
  title: string;
  /** Optional real audio file. When absent the player narrates the transcript. */
  src?: string;
  durationLabel: string;
  transcript: string;
};

export type VideoCard = {
  type: "video";
  title: string;
  /** Optional real video file. When absent the walkthrough steps play instead. */
  src?: string;
  poster: string;
  steps: { at: string; text: string }[];
};

export type LessonCard = TextCard | ImageCard | AudioCard | VideoCard;

export type ChoiceQuestion = {
  type: "choice";
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type BooleanQuestion = {
  type: "boolean";
  prompt: string;
  answer: boolean;
  explanation: string;
};

export type OrderQuestion = {
  type: "order";
  prompt: string;
  /** Correct sequence. Shuffled for the learner. */
  steps: string[];
  explanation: string;
};

export type Question = (ChoiceQuestion | BooleanQuestion | OrderQuestion) & { /** Database id when loaded from the admin-managed catalog. */ id?: string };

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  cards: LessonCard[];
  questions: Question[];
};

export type Unit = {
  id: string;
  title: string;
  blurb: string;
  accent: "teal" | "violet" | "amber" | "rose" | "sky";
  lessons: Lesson[];
};
