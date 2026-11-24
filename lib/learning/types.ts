import type { learningView } from "./view";
export type LearningView = Awaited<ReturnType<typeof learningView>>;
export type LearningConcept = LearningView["concepts"][number];
export type ConceptQuestion = {
  id: string;
  conceptId: string;
  prompt: string;
  options: { id: string; text: string }[];
  expiresAt: string;
};
export type ConceptFeedback = {
  correct: boolean;
  answer: string;
  explanation: string;
  conceptId: string;
  probability: number;
  posterior: number | null;
  observations: number;
  credited: boolean;
  notice: string;
};
