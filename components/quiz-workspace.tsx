"use client";
import { notifyProgress } from "../lib/progress-events";
import Link from "next/link";
import { useRef, useState } from "react";
import { Markdown } from "./markdown";
import { AccountMenu } from "./account-menu";
import { VelaBrand } from "./learning-frame";
import { Icon } from "./icons";
import { RecallDrawer } from "../app/study/[unitId]/components/RecallDrawer";
import type { Quiz, QuizProvider, QuizResult } from "../lib/quiz/types";

export function QuizWorkspace({
  unitId,
  title,
  moduleCode,
  preview,
}: {
  unitId: string;
  title: string;
  moduleCode: string;
  preview: boolean;
}) {
  const [provider, setProvider] = useState<QuizProvider>("heuristic");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const summary = useRef<HTMLDivElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  function goToStep(index: number) {
    setStep(index);
    requestAnimationFrame(() => questionHeading.current?.focus());
  }
  async function request<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error?.message || "Practice is temporarily unavailable. Try again.");
    return data as T;
  }
  async function generate() {
    setPending(true);
    setError("");
    try {
      const fresh = await request<Quiz>("/api/quiz/generate", { studyUnitId: unitId, provider });
      setQuiz(fresh);
      setAnswers({});
      setResult(null);
      goToStep(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Quiz generation failed.");
    } finally {
      setPending(false);
    }
  }
  async function submit() {
    if (!quiz) return;
    setPending(true);
    setError("");
    try {
      const graded = await request<QuizResult>("/api/quiz/submit", {
        attemptId: quiz.attemptId,
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          value: answers[question.id] ?? "",
        })),
      });
      setResult(graded);
      notifyProgress();
      requestAnimationFrame(() => {
        summary.current?.focus();
        summary.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Your answers could not be saved. Retry safely.",
      );
    } finally {
      setPending(false);
    }
  }
  const answered = quiz?.questions.filter((question) => answers[question.id]?.trim()).length ?? 0;
  const current = quiz?.questions[step];
  const reading = `/study/${unitId}`;
  return (
    <div className="quiz-shell editorial-quiz">
      <header className="app-header">
        <VelaBrand />
        <Link href={preview ? reading : `${reading}/sessions`} className="back-link">
          <Icon name="back" size={15} /> {preview ? "Back to preview" : "Unit overview"}
        </Link>
        <AccountMenu />
      </header>
      <main id="main-content" tabIndex={-1} className="quiz-main">
        <header className="quiz-page-title">
          <div className="eyebrow">{moduleCode} · UNIT QUIZ</div>
          <h1>{title}</h1>
        </header>
        {preview ? (
          <section className="quiz-start">
            <h2>Practice starts with your course reading.</h2>
            <p>
              This public preview has no ingested course content. Open a course unit with ingested
              passages to generate questions and save your mastery.
            </p>
            <Link className="primary-button" href="/">
              Open course library →
            </Link>
          </section>
        ) : (
          <>
            {!quiz && (
              <section className="quiz-start">
                <div>
                  <Icon name="check" size={25} />
                  <h2>Check your understanding</h2>
                  <p>
                    Work through multiple-choice and short-answer questions. Review your answers and
                    source explanations after submitting.
                  </p>
                </div>
                <details className="quiz-generator-options">
                  <summary>Question settings</summary>
                  <label>
                    Question generator
                    <select
                      value={provider}
                      onChange={(event) => setProvider(event.target.value as QuizProvider)}
                      disabled={pending}
                    >
                      <option value="heuristic">Free practice · no AI needed</option>
                      <option value="auto">Configured AI · free fallback</option>
                      <option value="ollama">Local Ollama · free fallback</option>
                      <option value="groq">Groq · free fallback</option>
                      <option value="gemini">Gemini · free fallback</option>
                      <option value="openrouter">OpenRouter · free routes</option>
                      <option value="cloudflare">Cloudflare AI · free fallback</option>
                    </select>
                  </label>
                </details>
                <div className="quiz-start-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={pending}
                    onClick={generate}
                  >
                    {pending ? "Preparing your practice…" : "Generate quiz"}{" "}
                    <Icon name="arrow" size={16} />
                  </button>
                  <RecallDrawer studyUnitId={unitId} chat="" />
                </div>
              </section>
            )}
            {error && (
              <p className="quiz-error" role="alert">
                {error}
              </p>
            )}
            {quiz && (
              <>
                <div className="quiz-meta">
                  <span>
                    {quiz.provider === "heuristic"
                      ? "SOURCE-BASED PRACTICE"
                      : `GENERATED BY ${quiz.provider.toUpperCase()}`}
                  </span>
                  <span>
                    {result
                      ? `${result.correct} of ${result.total} correct`
                      : `${answered} of ${quiz.questions.length} answered`}
                  </span>
                </div>
                {quiz.notice && (
                  <details className="quiz-notice">
                    <summary>Question source</summary>
                    <p>{quiz.notice}</p>
                  </details>
                )}
                <progress
                  aria-label="Questions answered"
                  value={answered}
                  max={quiz.questions.length}
                />
                {result && (
                  <div className="quiz-result" tabIndex={-1} ref={summary} role="status">
                    <span className="quiz-score">{result.score}%</span>
                    <div>
                      <h2>
                        {result.score >= 80
                          ? "The ideas are taking hold."
                          : "You’ve found what to revisit."}
                      </h2>
                      <p>
                        {result.earned} of {result.possible} points. Your latest score was saved for{" "}
                        {result.mastery.length} learning{" "}
                        {result.mastery.length === 1 ? "outcome" : "outcomes"}.
                      </p>
                    </div>
                  </div>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (pending || result || !current || !answers[current.id]?.trim()) return;
                    if (step < quiz.questions.length - 1) goToStep(step + 1);
                    else if (answered === quiz.questions.length) void submit();
                  }}
                >
                  <div className="quiz-questions">
                    {!result && (
                      <h2 className="quiz-step-title" ref={questionHeading} tabIndex={-1}>
                        Question {step + 1} of {quiz.questions.length}
                      </h2>
                    )}
                    {result && <h2 className="quiz-step-title">Review your answers</h2>}
                    {quiz.questions.map((question, index) => {
                      if (!result && step !== index) return null;
                      const feedback = result?.feedback.find(
                        (item) => item.questionId === question.id,
                      );
                      return (
                        <fieldset
                          key={question.id}
                          className={`quiz-question ${feedback ? (feedback.correct ? "answer-correct" : "answer-incorrect") : ""}`}
                          disabled={pending || !!result}
                        >
                          <legend>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            {question.kind === "MULTIPLE_CHOICE" ? "Choose one" : "Short answer"}
                            <small>
                              {question.points} {question.points === 1 ? "point" : "points"}
                            </small>
                          </legend>
                          <Markdown text={question.prompt} />
                          {question.kind === "MULTIPLE_CHOICE" ? (
                            <div className="quiz-options">
                              {question.options?.map((option) => (
                                <label
                                  key={option.id}
                                  className={answers[question.id] === option.id ? "selected" : ""}
                                >
                                  <input
                                    type="radio"
                                    name={question.id}
                                    value={option.id}
                                    checked={answers[question.id] === option.id}
                                    onChange={() =>
                                      setAnswers((current) => ({
                                        ...current,
                                        [question.id]: option.id,
                                      }))
                                    }
                                    required
                                  />
                                  <span className="option-letter">{option.id.toUpperCase()}</span>
                                  <span>{option.text}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <label className="short-answer">
                              Your answer
                              <input
                                aria-label={`Answer to question ${index + 1}`}
                                value={answers[question.id] ?? ""}
                                maxLength={500}
                                required
                                autoComplete="off"
                                onChange={(event) =>
                                  setAnswers((current) => ({
                                    ...current,
                                    [question.id]: event.target.value,
                                  }))
                                }
                              />
                              <small>
                                Use the source term. Letter case, spacing and surrounding
                                punctuation are ignored; equivalent mathematical expressions are not
                                evaluated.
                              </small>
                            </label>
                          )}
                          {feedback && (
                            <div className="quiz-feedback">
                              <strong>
                                {feedback.correct ? "✓ Correct" : "Revisit this idea"} ·{" "}
                                {feedback.earned}/{feedback.points}
                              </strong>
                              {!feedback.correct && (
                                <p>
                                  Expected answer: <b>{feedback.answer}</b>
                                </p>
                              )}
                              <Markdown text={feedback.explanation} />
                              <Link href={feedback.sourceUrl}>Review the source passage →</Link>
                            </div>
                          )}
                        </fieldset>
                      );
                    })}
                  </div>
                  {!result ? (
                    <div className="quiz-actions quiz-step-actions">
                      <button
                        type="button"
                        className="curriculum-secondary"
                        disabled={pending || step === 0}
                        onClick={() => goToStep(step - 1)}
                      >
                        <Icon name="back" size={15} /> Previous
                      </button>
                      <button
                        className="primary-button"
                        type="submit"
                        disabled={
                          pending ||
                          !current ||
                          !answers[current.id]?.trim() ||
                          (step === quiz.questions.length - 1 && answered !== quiz.questions.length)
                        }
                      >
                        {pending
                          ? "Checking and saving…"
                          : step < quiz.questions.length - 1
                            ? "Next question"
                            : "Check my understanding"}{" "}
                        <Icon name="arrow" size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="quiz-actions">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={generate}
                        disabled={pending}
                      >
                        {pending ? "Preparing…" : "Practice again"}
                      </button>
                      <Link href={`/study/${unitId}`}>Return to the reading →</Link>
                    </div>
                  )}
                </form>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
