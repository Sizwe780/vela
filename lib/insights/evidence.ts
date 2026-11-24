export type Evidence = {
  outcomeId: string;
  kind: "quiz" | "concept";
  score: number;
  at: string;
  id: string;
};
export type OutcomeInput = {
  id: string;
  title: string;
  unitId: string;
  unitTitle: string;
  moduleId: string;
  moduleCode: string;
  due: string | null;
  mixedScore: number | null;
  attempts: number;
  studyLink: string;
  nextSession: string | null;
};
export function outcomeEvidence(outcome: OutcomeInput, events: Evidence[]) {
  const own = events.filter(
    (e) =>
      e.outcomeId === outcome.id &&
      Number.isFinite(e.score) &&
      e.score >= 0 &&
      e.score <= 1 &&
      Number.isFinite(Date.parse(e.at)),
  );
  const quizzes = own
    .filter((e) => e.kind === "quiz")
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id.localeCompare(a.id));
  const concepts = own
    .filter((e) => e.kind === "concept")
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id.localeCompare(a.id));
  return {
    ...outcome,
    quiz: quizzes[0] ?? null,
    concept: concepts[0] ?? null,
    quizAttempts: quizzes.length,
    conceptAttempts: concepts.length,
    quizHistory: quizzes.slice(0, 6).reverse(),
    quizChange: quizzes.length > 1 ? Math.round((quizzes[0].score - quizzes[1].score) * 100) : null,
  };
}
export type OutcomeEvidence = ReturnType<typeof outcomeEvidence>;
export function studyRecommendations(rows: OutcomeEvidence[], now: Date) {
  const candidates = rows
    .flatMap((r) => {
      const base = {
        outcomeId: r.id,
        title: r.title,
        moduleCode: r.moduleCode,
        unitTitle: r.unitTitle,
      };
      const tasks: (typeof base & {
        kind: string;
        reason: string;
        href: string;
        priority: number;
      })[] = [];
      if (r.due && Date.parse(r.due) <= now.getTime())
        tasks.push({
          ...base,
          kind: "review",
          reason: "Your stored recall schedule is due. Test yourself before looking at the answer.",
          href: `/review?unit=${encodeURIComponent(r.unitId)}`,
          priority: 0,
        });
      if (r.quiz && r.quiz.score < 0.7)
        tasks.push({
          ...base,
          kind: "practice",
          reason: `Your latest recorded quiz practice for this outcome was ${Math.round(r.quiz.score * 100)}%. Revisit the explanation, then try another check.`,
          href: `/study/${encodeURIComponent(r.unitId)}/quiz`,
          priority: 1,
        });
      if (r.concept && r.concept.score < 0.7)
        tasks.push({
          ...base,
          kind: "explain",
          reason:
            "Your latest AI-assisted conceptual practice suggests revisiting your explanation. This is an estimate, not an institutional mark.",
          href: r.studyLink,
          priority: 2,
        });
      if (r.nextSession)
        tasks.push({
          ...base,
          kind: "read",
          reason:
            "This is an unfinished reading milestone in this unit. Reading completion and assessed practice are separate.",
          href: r.nextSession,
          priority: 3,
        });
      else if (!r.quiz)
        tasks.push({
          ...base,
          kind: "check",
          reason:
            "No quiz evidence for this outcome appears in your recent history. Try a practice check when ready.",
          href: `/study/${encodeURIComponent(r.unitId)}/quiz`,
          priority: 4,
        });
      return tasks;
    })
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.moduleCode.localeCompare(b.moduleCode) ||
        a.outcomeId.localeCompare(b.outcomeId),
    );
  const selected: typeof candidates = [],
    used = new Set<string>(),
    modules = new Set<string>();
  // Give enrolled modules a place, then fill with other urgent units.
  for (const diversify of [true, false])
    for (const candidate of candidates) {
      const unit = rows.find((r) => r.id === candidate.outcomeId)!.unitId;
      const moduleId = rows.find((r) => r.id === candidate.outcomeId)!.moduleId;
      if (used.has(unit) || (diversify && modules.has(moduleId))) continue;
      used.add(unit);
      modules.add(moduleId);
      selected.push(candidate);
      if (selected.length === 5) return selected;
    }
  return selected;
}
