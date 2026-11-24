export type QuizProvider =
  "auto" | "heuristic" | "ollama" | "cloudflare" | "openai" | "groq" | "gemini" | "openrouter";
export type QuizSource = { id: string; learningOutcomeId: string; title: string; body: string };
export type DraftQuestion = {
  sourceChunkId: string;
  kind: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  prompt: string;
  options: { id: string; text: string }[] | null;
  answer: { optionId?: string; accepted?: string[] };
  explanation: string;
};
export type PublicQuestion = Pick<
  DraftQuestion,
  "kind" | "prompt" | "options" | "sourceChunkId"
> & { id: string; points: number };
export type Quiz = {
  attemptId: string;
  studyUnitId: string;
  provider: string;
  notice: string;
  expiresAt: string;
  questions: PublicQuestion[];
};
export type QuizFeedback = {
  questionId: string;
  correct: boolean;
  earned: number;
  points: number;
  answer: string;
  explanation: string;
  sourceUrl: string;
};
export type QuizResult = {
  attemptId: string;
  score: number;
  earned: number;
  possible: number;
  correct: number;
  total: number;
  feedback: QuizFeedback[];
  mastery: { learningOutcomeId: string; score: number }[];
};
