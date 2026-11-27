"use client";
import { notifyProgress } from "../lib/progress-events";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnswerSymbols } from "./math/answer-symbols";
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
  const [operation, setOperation] = useState<"generate" | "submit" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!pending) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [pending]);
  const summary = useRef<HTMLDivElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  function goToStep(index: number) {
    setStep(index);
    requestAnimationFrame(() => questionHeading.current?.focus());
  }
  async function request<T>(path: string, body: unknown): Promise<T> {
    const current = new AbortController();
    controller.current = current;
    const response = await fetch(path, {
      signal: AbortSignal.any([current.signal, AbortSignal.timeout(45000)]),
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
    if (pending) return;
    setOperation("generate");
    setPending(true);
    setError("");
    try {
      const fresh = await request<Quiz>("/api/quiz/generate", { studyUnitId: unitId, provider });
      setQuiz(fresh);
      setAnswers({});
      setResult(null);
      goToStep(0);
    } catch (caught) {
      setError(requestError(caught, "Quiz generation failed. Please retry."));
    } finally {
      setPending(false);
    }
  }
  async function submit() {
    if (!quiz || pending) return;
    setOperation("submit");
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
      setError(requestError(caught, "Your answers could not be saved. Retry safely."));
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
                      <option value="heuristic">Unit question bank · no AI needed</option>
                      <option value="auto">Automatic · unit question bank</option>
                      <option value="ollama">Local Ollama · question bank fallback</option>
                      <option value="groq">Groq · question bank fallback</option>
                      <option value="gemini">Gemini · question bank fallback</option>
                      <option value="openrouter">OpenRouter · free routes</option>
                      <option value="cloudflare">Cloudflare AI · question bank fallback</option>
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
            {pending && (
              <div className="quiz-loading-status" role="status" aria-live="polite">
                <strong>
                  {operation === "submit"
                    ? "Checking answers and saving your evidence"
                    : provider === "heuristic" || provider === "auto"
                      ? "Loading your unit bank and saving a fresh attempt"
                      : elapsed < 20
                        ? "Drafting and validating AI questions"
                        : "Still preparing practice; timed-out AI requests use the free fallback"}
                </strong>
                <p>
                  {elapsed}s elapsed.{" "}
                  {operation === "generate"
                    ? provider === "heuristic" || provider === "auto"
                      ? "No AI request is made. Your questions are being loaded and saved securely."
                      : "AI generation is limited to 20 seconds before a question-bank fallback; saving can take a little longer."
                    : "Unsupported or ambiguous answers are left ungraded, rather than counted wrong."}
                </p>
                <button type="button" onClick={() => controller.current?.abort()}>
                  Cancel request
                </button>
              </div>
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
                    {["heuristic", "bank"].includes(quiz.provider)
                      ? "UNIT PRACTICE BANK"
                      : `GENERATED BY ${quiz.provider.toUpperCase()}`}
                  </span>
                  <span>
                    {result
                      ? `${result.correct} of ${result.feedback.filter((f) => f.status !== "unverified").length} graded correct`
                      : `${answered} of ${quiz.questions.length} answered`}
                  </span>
                </div>
                {!result && (
                  <small>
                    Use A–D to choose an option; Enter advances when an answer is ready.
                  </small>
                )}
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
                    <span className="quiz-score">
                      {result.score === null ? "Needs review" : `${result.score}%`}
                    </span>
                    <div>
                      <h2>
                        {result.score === null
                          ? "No automatic grade was assigned."
                          : result.score >= 80
                            ? "The ideas are taking hold."
                            : "You’ve found what to revisit."}
                      </h2>
                      <p>
                        {result.earned} of {result.possible}{" "}
                        {result.possible === 1 ? "point" : "points"}. Your latest score was saved
                        for {result.mastery.length} learning{" "}
                        {result.mastery.length === 1 ? "outcome" : "outcomes"}.
                        {result.feedback.some((f) => f.status === "unverified") &&
                          " Ungraded items are excluded from this score and from mastery updates."}
                      </p>
                    </div>
                  </div>
                )}
                <form
                  onKeyDown={(event) => {
                    if (
                      pending ||
                      result ||
                      !current ||
                      event.ctrlKey ||
                      event.metaKey ||
                      event.altKey ||
                      (event.target instanceof Element &&
                        event.target.closest("input:not([type=radio]), textarea, math-field"))
                    )
                      return;
                    const key = event.key.toLowerCase();
                    if (
                      current.kind === "MULTIPLE_CHOICE" &&
                      ["a", "b", "c", "d"].includes(key) &&
                      current.options?.some((o) => o.id === key)
                    ) {
                      event.preventDefault();
                      setAnswers((values) => ({ ...values, [current.id]: key }));
                    }
                  }}
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
                          className={`quiz-question ${feedback ? (feedback.status === "unverified" ? "answer-unverified" : feedback.correct ? "answer-correct" : "answer-incorrect") : ""}`}
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
                                  <div className="quiz-option-text">
                                    <Markdown text={option.text} />
                                  </div>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="short-answer">
                              <label>
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
                              </label>
                              {!result && (
                                <AnswerSymbols
                                  question={question.prompt}
                                  value={answers[question.id] ?? ""}
                                  onChange={(value) =>
                                    setAnswers((current) => ({
                                      ...current,
                                      [question.id]: value.slice(0, 500),
                                    }))
                                  }
                                  disabled={pending}
                                />
                              )}
                              <small>
                                You may use plain notation or LaTeX, including outer dollar
                                delimiters. Supported formulas are checked symbolically. Define
                                alternative symbols; ambiguous answers are left ungraded. For
                                missing-term questions, use the source term or accepted equivalent
                                terminology.
                              </small>
                            </div>
                          )}
                          {!feedback && answers[question.id]?.trim() && (
                            <Link href={question.sourceUrl ?? `${reading}/sessions`}>
                              Revisit the related reading →
                            </Link>
                          )}
                          {feedback && (
                            <div className="quiz-feedback">
                              <strong>
                                {feedback.status === "unverified"
                                  ? "Needs review · ungraded"
                                  : `${feedback.correct ? "Correct" : "Revisit this idea"} · ${feedback.earned}/${feedback.points}`}
                              </strong>
                              {!feedback.correct && (
                                <div>
                                  <strong>Reference answer</strong>
                                  <Markdown text={feedback.answer} />
                                </div>
                              )}
                              {feedback.gradingMessage && <p>{feedback.gradingMessage}</p>}
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

function requestError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.name === "AbortError")
    return "Request cancelled. Your current answers are still here.";
  if (error instanceof Error && error.name === "TimeoutError")
    return "The request took too long. Your answers are still here; please retry.";
  return error instanceof Error ? error.message : fallback;
}
